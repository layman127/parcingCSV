import fs from 'fs';
import axios from 'axios';
import { shopdata } from './shopdata.js';
// Ссылка;Артиккул;Название;Ед.изм;Цена по скидке; Цена; Цена по дис. карте;
// Ссылки на картинки;Регион


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
//функция записывающая объект
async function getItemAfterCheck(item, targetregion){
  //алгоритм определения актуальной цены
  if (1){
    return finalprice = x;
    
  };
  
  let obj = {
    "url" : "https://www.oboykin.ru"+item.uri,
    "vendercode" : item.article,
    "name" : item.tovartype+" "+item.vendor.name+" "+item.article,
    "unit" : item.unit,
    "price" : finalprice,
    "imageurl" : "Ссылки на картинки",
    "region" : targetregion,
  };
  return obj;
};


//функциb getItemSpb и getItemMsk  проверяют если ли нужный к записи объект (макс 1) по соответствующему региону, если есть в наличии хотя бы 1 товар в регионе. Само количетсво товара не возвращается. Главное - факт наличия
async function getItemSpb(item){
  const targetregion = "Санкт-Петербург"
  //смотрим есть ли в наличии товар хотя бы в одном из магазинов спб.
  for (let region of item.availability){
    //если регион санкт-петербург и в нем больше 0 товара в наличии, то тогда запускается алгоритм сборки объекта, который вдальнейшем станет строкой в файле
    if (region.shopaddress.includes(region) && region.available > 0){
      
  
      let itemSpb= await getItemAfterCheck(item, targetregion);

      console.log ('Вытащили товар');
      return itemSpb;

    }else{
      console.log("Не тот регион или нет товара в нужном регионе"+region.shopaddress +"    ===    "+ region.available )
    }
  }
};

async function getItemMsk(item){
  if(1){
    let itemMsk={
      "url" : item.uri,
      "vendercode" : item.id,
      "name" : item.vendor.name,
      "unit" : item.unit,
      "saleprice" : item.sale_price,
      "price" : item.price,
      "imageurl" : item.images,
      "region" : item.availability[0].shopaddress,
    }
    return itemMsk
  };
};

//функция getGoods возвращает массив объектов (максимум 2) после того как функция прошлась по item
async function getGoods(item){
  let itemSpb = await  getItemSpb(item);
  let itemMsk = await getItemMsk(item);
  let targetObjects = [itemSpb,itemMsk];
  return targetObjects;
};
//сборка массива объекта. обращаемся к каждому товару в items (результате запроса)
for (let item of shopdata.items){
  //отдаем товар методу getGoods. Метод вернет массив объектов, которые будут уже готовы для записи в preparcingdata 
  for (let good of getGoods(item)){
    //каждый готовый объект из метода getGoods записываем в массив объектов preParcingData для дальнейшей записи 
    preParcingData.push(good)
  };
};

//записываю весь массив объектов preParcingData в csv файл построчно
// убрат
// fs.writeFileSync("result.csv", 'Ссылка;Артиккул;Название;Ед.изм;Цена по скидке; Цена; Цена по дис. карте;Ссылки на картинки;Регион');
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

