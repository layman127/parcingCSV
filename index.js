import fs from 'fs';
import got from 'got';

start();
export async function start(pathToCSV='./', nameOfFile='result.csv'){
    const fullPath = pathToCSV+nameOfFile;
    //создание файла csv c требуемыми столбцами
    await fs.promises.writeFile(`${fullPath}`, 'url;vendor_code;name;unit;price;image_url;region');
    //вызов функции, выполняющеи запросы на сервер
    await getItemsFromServer(fullPath);
};
async function getItemsFromServer(fullPath) {  
    try {
        // Получаем общее количество товаров
        const responseTotalItemsNumber = await got('https://www.oboykin.ru/filter/products?begin=0&end=1',{responseType: 'json'});
        let totalItemsNumber = await responseTotalItemsNumber.body.total;
        let amoutOfFullRequests = Math.floor(totalItemsNumber/32); //получим количество целых запросов
        let prelastItemNumber = amoutOfFullRequests*32; //номер последнего полученного товара от целых запросов
        let amountOfLastItems = totalItemsNumber - prelastItemNumber; // количество остатков
        let begin = 0
        let end = 32
        let shopdataEndFlag=false
        while(!shopdataEndFlag){
            let responseShopData = await got(`https://www.oboykin.ru/filter/products?begin=${begin}&end=${end}`, {responseType: 'json'});
            // Данные из тела ответа уже распарсены в JSON
            // Цикл по каждому объекту (товару) внутри itemsOneResponse.items. На каждый товар в ответе вызывается функция saveItemsFromAllRegions()
            for (let item of responseShopData.body.items) {
                await  saveItemFromOneRegion(item, "Санкт-Петербург", fullPath);
                await  saveItemFromOneRegion(item, "Москва",fullPath);
            };
            //если запрос НЕ предпоследний, то счетчик просто идет на один шаг вперед
            if(end<prelastItemNumber){
                begin += 32;
                end += 32;
            //в случае если запросы дошли до предпоследнего запроса - запускается скрипт последнего запроса, который завершает цикл запросов
            }else if(end=prelastItemNumber){
                begin += 32;
                end += amountOfLastItems;
                let responseShopDataLast = await got(`https://www.oboykin.ru/filter/products?begin=${begin}&end=${end}`, {responseType: 'json'});      
                // Цикл по последним товарам
                for (let item of responseShopDataLast.body.items) {
                    await  saveItemFromOneRegion(item, "Санкт-Петербург", fullPath);
                    await  saveItemFromOneRegion(item, "Москва",fullPath);
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
//функция saveItemFromOneRegion возвращает 1 объект по нужному региону
async function saveItemFromOneRegion(item,targetregion,fullPath){
    const separator = ";"
    let substringsOfRegionNames;
    if(targetregion=='Санкт-Петербург'){
        substringsOfRegionNames = ['г. Санкт-Петербург','г. Колпино'];
    } else if (targetregion=='Москва'){
        substringsOfRegionNames = ['Москва','Московская обл'];
    };
    //смотрим есть ли в наличии товар хотя бы в одном из магазинов спб.
    for (let region of item.availability){
        //если регион санкт-петербург и в нем больше 0 товара в наличии, то тогда запускается алгоритм сборки объекта, который вдальнейшем станет строкой в файле
        if (substringsOfRegionNames.some(substring => region.shopaddress.includes(substring))){
            let finalprice;
            //проверяем есть ли цена по акции
            if (item.sale_price!==0){    
                finalprice = item.sale_price;
            } else {
            //если нет цены по акции, то берем общую цену.
                finalprice = item.price
            };
            //если в итоге цена равна нулю, то нам эта интерация неинтересна, пропускаем товар
            if(finalprice==0){
                break;
            };
            if(item.tovartype == 'Каталог'){
                break;
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
            if(obj!= null){
                const values = Object.values(obj);
                // Добавляем строку в файл
                fs.appendFile(`${fullPath}`, `\n${values.join(separator)}`, (err) => {
                    if (err) throw err;
                }); 
            };  
            break;
        };    
    };
};            
