import fs from 'fs';
import axios from 'axios';
import { shopdata } from './shopdata.js';

//запрос с сервера потом сделаю
// async function fetchData() {
//     try {
//       const response = await axios.get('https://api.example.com/data', {
//         headers: {
//           'Authorization': 'Bearer your-token',
//           'Custom-Header': 'value123'
//         }
//       });
//       console.log(response.data);
//     } catch (error) {
//       console.error('Ошибка запроса:', error);
//     }
//   }

//создание первой строки scv документа, которая будет являться заголовками столбцов
const preParcingData = [
  {
    "url" : "Ссылка",
    "vendercode" : "Артиккул",
    "name" : "Название",
    "unit" : "Ед.изм",
    "price" : "Цена",
    "imageurl" : "Ссылки на картинки",
    "region" : "Регион"
  },
];


//функциb getItemFromRegion  проверяют если ли нужный к записи объект (макс 1) по соответствующему региону, если есть в наличии хотя бы 1 товар в регионе. Само количетсво товара не возвращается. Главное - факт наличия
async function getItemFromRegion(item,targetregion){
  let substringsOfRegionNames;
  if(targetregion=='Санкт-Петербург'){
    substringsOfRegionNames = ['г. Санкт-Петербург','г. Колпино'];
  } else if (targetregion=='Москва'){
    substringsOfRegionNames = ['Москва','Московская обл'];
  };

  //смотрим есть ли в наличии товар хотя бы в одном из магазинов спб.
  for (let region of item.availability){
    //если регион санкт-петербург и в нем больше 0 товара в наличии, то тогда запускается алгоритм сборки объекта, который вдальнейшем станет строкой в файле
    if (substringsOfRegionNames.some(substring => region.shopaddress.includes(substring)) &&
    (region.available > 0 || region.onsale > 0))
    {
      console.log(`+++Найден товар в ${region.shopaddress} в колличестве `+ region.available + region.onsale);
      let finalprice;
      if (item.sale_price!==0){    
        finalprice = item.sale_price;
        // console.log(`Товар по акции с ценой: ${finalprice}`);
      } else {
        finalprice = item.price
        // console.log(`Товар со стандартной ценой или по распродаже: ${finalprice}`);
      };
      if(finalprice==0){
        // console.log("Нулевая цена у товара")
      };
      let obj = {
        "url" : "https://www.oboykin.ru/"+item.uri,
        "vendercode" : item.article,
        "name" : item.tovartype+" "+item.vendor.name+" "+item.article,
        "unit" : item.unit,
        "price" : finalprice,
        "imageurl": item.images,
        "region" : targetregion,
      };
      // console.log ('---Вытащили товар---');
      // console.log(obj);
      return obj;
    }else{
      // console.log("---Не тот регион или нет товара в нужном регионе"+region.shopaddress +"    ===    "+ region.available )
    }
  }
};


//функция getGoods возвращает массив объектов (максимум 2 - москва и питер) после того как функция прошлась по item
async function getGoodsFromAllRegions(item){
  let itemSpb = await  getItemFromRegion(item, "Санкт-Петербург");
  let itemMsk = await  getItemFromRegion(item, "Москва");
  //объединяю собираю массив из вытащенных товаров по регионам. Если найден товар в обоих регионах - то в массив кладется 2 товара. Если только в 1 регионе - то только один.
  if(typeof(itemSpb)!=='undefined'&&typeof(itemMsk)!=='undefined'){
    let targetObjects = [itemSpb,itemMsk];
    return targetObjects;
  }else if (typeof(itemSpb)=='undefined'&&typeof(itemMsk)!=='undefined'){
    let targetObjects = [itemMsk];
    return targetObjects;
  }else if(typeof(itemSpb)!=='undefined'&&typeof(itemMsk)=='undefined'){
    let targetObjects = [itemSpb];
    return targetObjects;
  }else if(typeof(itemSpb)=='undefined'&&typeof(itemMsk)=='undefined'){
    // console.log("Ни в одном регионе нет товара  "+item.tovartype+" "+item.vendor.name+" "+item.article)
  }
};

//сборка массива объекта. обращаемся к каждому товару (объекту) в items (массиву объектов) (результате запроса)
for (let item of shopdata.items){
  let targetObjects = await getGoodsFromAllRegions(item);
  // console.log(":::Результат вывода объектов:::");
  // console.log(targetObjects);
  //отдаем товар методу getGoodsFromAllRegions. Метод вернет массив объектов, которые будут уже готовы для записи в preparcingdata 
  if(typeof(targetObjects)!=='undefined'){
    for (let good of targetObjects ){
      //каждый готовый объект из метода getGoods добавляем в массив объектов preParcingData для дальнейшей записи 
      preParcingData.push(good)
    };
  }  
};

//записываю весь массив объектов preParcingData в csv файл построчно
//запись в csv происходит одномоментно, поэтому нужно перед записью приготовить массив объектов preParcingData
const separator = ";"
//дробление массива объектов на объекты через map
fs.writeFileSync("result.csv", preParcingData.map(row => {
  //дробление объекта на свойства по ключам
  const valuesOfObject = [];
  for (const key in row) {
    //собираю данные из свойств объекта в массив valuesOfObject
    valuesOfObject.push(row[key]);
  }
  //соединяю в одну строку весь массив через разделитель и возвращаю для создания массива строк
  return valuesOfObject.join(separator);
  //массив строк соединяю в строку добавляя после каждой строки перенос
}).join("\n"));

