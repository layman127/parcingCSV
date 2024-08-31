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
function createNewObject(item){
  let newObject={
    "url" : item.uri,
    "vendercode" : item.id,
    "name" : item.vendor.name,
    "unit" : item.unit,
    "saleprice" : item.sale_price,
    "price" : item.price,
    "imageurl" : item.images,
    "region" : item.availability[0].shopaddress,
  }
  return newObject;
}
const preParcingData = [
  {
    "url" : "Ссылка",
    "vendercode" : "Артиккул",
    "name" : "Название",
    "unit" : "Ед.изм",
    "price" : "Цена по скидке",
    "saleprice" : "Цена",
    "imageurl" : "Цена по дис. карте",
    "region" : "Регион"
  }
];

for (let item of shopdata.items){
  
  
  preParcingData.push(
    createNewObject(item)
  );
};
  
// const preParcingData = [
//   {
//     "url" : "string",
//     "vendercode" : 'string',
//     "name" : 'string',
//     "unit" : 'string',
//     "price" : 'string',
//     "saleprice" : 'string',
//     "url" : 'string',
//     "region" : 'string',
//   }
// ];

fs.writeFileSync("result.csv", 'Ссылка;Артиккул;Название;Ед.изм;Цена по скидке; Цена; Цена по дис. карте;Ссылки на картинки;Регион');
const separator = ";"
fs.writeFileSync("result.csv", preParcingData.map(row => {
  const valuesOfObject = [];
  for (const key in row) {
    valuesOfObject.push(row[key]);
  }
  return valuesOfObject.join(separator);
}).join("\n"));

