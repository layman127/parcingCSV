import fs from 'fs';
import got from 'got';
import { performance } from 'perf_hooks';

//замеры используемой ОЗУ
/*
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log('-------------------');
  console.log(`RSS: ${memoryUsage.rss / 1024 / 1024} MB`);
  console.log('-------------------');
}, 10000); // вывод каждые 10 секунд
*/
//функция для задержки между запросам
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Запуск таймера
const start = performance.now();
//создание первой строки scv документа, которая будет являться заголовками столбцов
const preParcingData = [
  {
    "url" : "Ссылка",
    "vendercode" : "Артиккул",
    "name" : "Название",
    "unit" : "Ед.изм",
    "price" : "Цена",
    "imageurl" : "Ссылки на картинки",
    "region" : "Регион",
  },
];
creatingSCV(preParcingData);
async function creatingSCV(preParcingData) {
  console.log("Start function creatingSCV")
  //запуск и ожидание выполнения функции creatingPreparcingData по сборке данных для записи в файл. После этой функции возвращается дополненный массив PreparcingData
  await creatingPreparcingData(preParcingData);
  //записываю весь массив объектов preParcingData в csv файл построчно
  const separator = ";"
  //дробление массива объектов на объекты через map
  fs.writeFileSync("result.csv", preParcingData.map(row => {
      //дробление объекта на свойства по ключам
      console.log(`Записы товара в CSV : `+preParcingData.indexOf(row) );
      const valuesOfObject = [];
      for (const key in row) {
        //собираю данные из свойств объекта в массив valuesOfObject
        valuesOfObject.push(row[key]);
      }
      //соединяю в одну строку весь массив  valuesOfObject через разделитель и возвращаю для создания массива строк
      return valuesOfObject.join(separator);
      //массив строк соединяю в строку добавляя после каждой строки перенос
    }).join("\n")
  );
  console.log("Finish function creatingSCV")
  setTimeout(() => {
    // Остановка таймера
    const end = performance.now();
    console.log(`Execution time: ${end - start} ms`);
  }, 1000);  
};
//функция по созданию массива объектов с товарами, готовыми к записи в scv файл
async function creatingPreparcingData(preParcingData) {
  console.log("Start function creatingPreparcingData")
  //вызов и ожидание выполнения функции getShopData, которая запрашивает данные с сайта обойкина
  let shopdata = await getShopData();
  // console.log(shopdata)
  for (let item of shopdata){
    //вызов и  ожидание функции getGoodsFromAllRegions, которая должная вернуть от 0 до 2 объектов для записи по каждому товару из shopdata
    let targetObjects = await getGoodsFromAllRegions(item);
    // console.log(":::Результат вывода объектов:::");
    // console.log(targetObjects);
    //отдаем товар методу getGoodsFromAllRegions. Метод вернет массив объектов, которые будут уже готовы для записи в preparcingdata 
    if(typeof(targetObjects)!=='undefined'){
      for (let good of targetObjects ){
        //каждый готовый объект из метода getGoods добавляем в массив объектов preParcingData для дальнейшей записи 
        preParcingData.push(good);
      };
    }  
  };
  console.log("Finish function creatingPreparcingData")
};
//функция getShopData, которая выполняет запрос на сервер обойкина.
async function getShopData() {  
  console.log("Start function getShopData from server")
  try {
    // Получаем общее количество товаров
    const responseTotalItemsNumber = await got('https://www.oboykin.ru/filter/products?begin=0&end=1');
    let responseTotalItemsNumberJSON = await JSON.parse(responseTotalItemsNumber.body);
    let totalItemsNumber = await responseTotalItemsNumberJSON.total;
    console.log("C сервера будет запрошено товаров: "+totalItemsNumber);
    let amoutOfFullRequests = Math.floor(totalItemsNumber/32); //получим количество целых запросов
    console.log(`amoutOfFullRequests == ${amoutOfFullRequests} `);
    let prelastItemNumber = amoutOfFullRequests*32; //номер последнего полученного товара от целых запросов
    console.log(`prelastItemNumber == ${prelastItemNumber} ` );
    let amountOfLastItems = totalItemsNumber - prelastItemNumber; // количество остатков
    console.log(`amountOfLastItems == ${amountOfLastItems} ` );
    let shopdata = [];
    let begin = 0
    let end = 32
    let shopdataEndFlag=false
    while(!shopdataEndFlag){
      await delay(100);
      let responseShopData = await got(`https://www.oboykin.ru/filter/products?begin=${begin}&end=${end}`);
      let itemsOneResponse = await JSON.parse(responseShopData.body);
      shopdata.push(...itemsOneResponse.items)
      console.log(`Cделан запрос от ${begin} до ${end}`);
      if(end<prelastItemNumber){
          begin += 32;
          end += 32;
      }else if(end=prelastItemNumber){
          console.log(`PreEnd`)
          begin += 32;
          end += amountOfLastItems;
          let responseShopDataLast = await got(`https://www.oboykin.ru/filter/products?begin=${begin}&end=${end}`);
          let itemsOneResponseLast = await JSON.parse(responseShopDataLast.body);
          shopdata.push(...itemsOneResponseLast.items)
          console.log(`Cделан запрос от ${begin} до ${end}`);
          console.log(`End ${end}`)
          shopdataEndFlag=true;   
      }; 
    };
    //файл для отладки
    // await fs.promises.writeFile('shopdatanew.json', JSON.stringify(shopdata, null, 2));
    console.log("C сервера получено товаров: "+shopdata.length);
    console.log("Finish function getShopData from server")
    return shopdata;

  } catch (error) {
    // Обрабатываем ошибки, может не быть response
    const status = error.response ? error.response.status : 'Unknown status';
    const body = error.response ? error.response.body : 'Unknown body';
    console.error(`${status} ${body}`);
    throw error;  // Перебрасываем ошибку выше для дальнейшей обработки
  }
}
//функция getGoodsFromAllRegions возвращающая массив объектв для записи в preparcingData
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
//функция getItemFromRegion функция собирающая объект для записи
async function getItemFromRegion(item,targetregion){
  let substringsOfRegionNames;
  if(targetregion=='Санкт-Петербург'){
    substringsOfRegionNames = ['г. Санкт-Петербург','г. Колпино'];
  } else if (targetregion=='Москва'){
    substringsOfRegionNames = ['Москва','Московская обл'];
  };

  //смотрим есть ли в наличии товар хотя бы в одном из магазинов спб.
  // if(!Array.isArray(item.availability)){
  //   console.log(item)
  // }
  // console.log('Тип item.availability:', typeof item.availability);
  for (let region of item.availability){
    //если регион санкт-петербург и в нем больше 0 товара в наличии, то тогда запускается алгоритм сборки объекта, который вдальнейшем станет строкой в файле
    if (substringsOfRegionNames.some(substring => region.shopaddress.includes(substring)) &&
    (region.available > 0 || region.onsale > 0))
    {
      // console.log(`+++Найден товар в ${region.shopaddress} в колличестве `+ region.available + region.onsale);
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
