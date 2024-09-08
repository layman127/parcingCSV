import fs from 'fs';
import got from 'got';
import { performance } from 'perf_hooks';

//---отладочная часть---
//замеры используемой ОЗУ
/*
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    console.log('-------------------');
    console.log(`RSS: ${memoryUsage.rss / 1024 / 1024} MB`);
    console.log('-------------------');
}, 30000); // вывод каждые 30 секунд
*/

//функция для задержки между запросам
function delay(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

//---функциональная часть---
let path;
let nameCSV;
start();
export async function start(pathToCSV='./', nameOfFile='result.csv'){
    path = pathToCSV;
    nameCSV = nameOfFile;
    // Запуск таймера
    const start = performance.now();
    //создание файла csv c требуемыми столбцами
    await fs.promises.writeFile(`${path}${nameCSV}`, 'url;vendor_code;name;unit;ptice;image_url;region');
    console.log(`File result.csv created `)
    //вызов функции, выполняющеи запросы на сервер
    await getItemsFromServer(path);
    const end = performance.now();
    console.log("Script finish by "+Math.floor(end-start)+" ms")
};
async function getItemsFromServer() {  
    try {
    console.log("Start function getItemsFromServer")
    // Получаем общее количество товаров
    const responseTotalItemsNumber = await got('https://www.oboykin.ru/filter/products?begin=0&end=1');
    let responseTotalItemsNumberJSON = await JSON.parse(responseTotalItemsNumber.body);
    let totalItemsNumber = await responseTotalItemsNumberJSON.total;
    // totalItemsNumber = 100;
    console.log("totalItemsNumber == "+totalItemsNumber);
    let amoutOfFullRequests = Math.floor(totalItemsNumber/32); //получим количество целых запросов
    console.log(`amoutOfFullRequests == ${amoutOfFullRequests} `);
    let prelastItemNumber = amoutOfFullRequests*32; //номер последнего полученного товара от целых запросов
    console.log(`prelastItemNumber == ${prelastItemNumber} ` );
    let amountOfLastItems = totalItemsNumber - prelastItemNumber; // количество остатков
    console.log(`amountOfLastItems == ${amountOfLastItems} ` );
    let begin = 0
    let end = 32
    let shopdataEndFlag=false
    while(!shopdataEndFlag){
      // await delay(100);
      const startReq = performance.now();
      let responseShopData = await got(`https://www.oboykin.ru/filter/products?begin=${begin}&end=${end}`, {responseType: 'json'});
      const endReq = performance.now();
      let reqTime = Math.floor(endReq - startReq);
      console.log(`Make request from ${begin} to ${end} items by ${reqTime} ms `);
      // Данные из тела ответа уже распарсены в JSON
      let itemsOneResponse = responseShopData.body;
  
      // Цикл по каждому объекту (товару) внутри itemsOneResponse.items. На каждый товар в ответе вызывается функция saveGoodsFromAllRegions()
      for (let item of itemsOneResponse.items) {
          saveGoodsFromAllRegions(item);
      };
      //если запрос НЕ предпоследний, то счетчик просто идет на один шаг вперед
      if(end<prelastItemNumber){
          begin += 32;
          end += 32;
      //в случае если запросы дошли до предпоследнего запроса - запускается скрипт последнего запроса, который завершает цикл запросов
      }else if(end=prelastItemNumber){
          console.log(`PreEnd`)
          begin += 32;
          end += amountOfLastItems;
          let responseShopDataLast = await got(`https://www.oboykin.ru/filter/products?begin=${begin}&end=${end}`, {responseType: 'json'});
          console.log(`Make request from ${begin} to ${end} items`);
          let itemsOneResponseLast = responseShopDataLast.body;         
          console.log(`End ${end}`)
          // Цикл по последним товарам
          for (let item of itemsOneResponseLast.items) {
              saveGoodsFromAllRegions(item);
          }

          shopdataEndFlag=true;   
      }; 
    };    
    } catch (error) {
    // Обрабатываем ошибки, может не быть response
    const status = error.response ? error.response.status : 'Unknown status';
    const body = error.response ? error.response.body : 'Unknown body';
    console.error(`${status} ${body}`);
    throw error;  // Перебрасываем ошибку выше для дальнейшей обработки
    }
};
//функция saveGoodsFromAllRegions выполняет запись в scv файл 
async function saveGoodsFromAllRegions(item){
    //функция getItemFromRegion возвращает 1 объект по нужному региону
    let itemSpb = await  getItemFromRegion(item, "Санкт-Петербург");
    let itemMsk = await  getItemFromRegion(item, "Москва");
    const separator = ";"
    // console.log(typeof(itemSpb));
    if(itemSpb != null){
        const values = Object.values(itemSpb);
        // Добавляем строку в файл
        fs.appendFile(`${path}${nameCSV}`, `\n${values.join(separator)}`, (err) => {
            if (err) throw err;
        }); 
    };    
    if(itemMsk != null){
        const values = Object.values(itemMsk);
        // Добавляем строку в файл
        fs.appendFile(`${path}${nameCSV}`, `\n${values.join(separator)}`, (err) => {
            if (err) throw err;
        });
    };
    // console.log('ItemSaved')
};
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