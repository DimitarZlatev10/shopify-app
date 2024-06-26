import { GraphqlQueryError } from "@shopify/shopify-api";
import shopify from "./shopify.js";
import createToc from "./toc.js";
import createProductDescription from "./product-description.js";
import { DEFAULT_PRODUCTS_COUNT } from "./constants.js";
import { readFromFile, writeToFile } from "../web/frontend/utils/fileWriter.js";
import { langchain } from "./langchain-translate.js";

// const ADJECTIVES = [
//   "autumn",
//   "hidden",
//   "bitter",
//   "misty",
//   "silent",
//   "empty",
//   "dry",
//   "dark",
//   "summer",
//   "icy",
//   "delicate",
//   "quiet",
//   "white",
//   "cool",
//   "spring",
//   "winter",
//   "patient",
//   "twilight",
//   "dawn",
//   "crimson",
//   "wispy",
//   "weathered",
//   "blue",
//   "billowing",
//   "broken",
//   "cold",
//   "damp",
//   "falling",
//   "frosty",
//   "green",
//   "long",
// ];
// const NOUNS = [
//   "waterfall",
//   "river",
//   "breeze",
//   "moon",
//   "rain",
//   "wind",
//   "sea",
//   "morning",
//   "snow",
//   "lake",
//   "sunset",
//   "pine",
//   "shadow",
//   "leaf",
//   "dawn",
//   "glitter",
//   "forest",
//   "hill",
//   "cloud",
//   "meadow",
//   "sun",
//   "glade",
//   "bird",
//   "brook",
//   "butterfly",
//   "bush",
//   "dew",
//   "dust",
//   "field",
//   "fire",
//   "flower",
// ];

const ADJECTIVES = [
  "есенен",
  "скрит",
  "горчив",
  "мъглив",
  "мълчалив",
  "празен",
  "сух",
  "тъмен",
  "лятен",
  "леден",
  "нежен",
  "тих",
  "бял",
  "прохладен",
  "пролетен",
  "зимен",
  "търпелив",
  "здрачен",
  "зорен",
  "червенкав",
  "пухкав",
  "обветрен",
  "син",
  "вълнуващ",
  "счупен",
  "студен",
  "влажен",
  "падащ",
  "мразовит",
  "зелен",
  "дълъг"
];

const NOUNS = [
  "водопад",
  "река",
  "вятър",
  "луна",
  "дъжд",
  "вятър",
  "море",
  "сутрин",
  "сняг",
  "езеро",
  "залез",
  "бор",
  "сянка",
  "лист",
  "зора",
  "блясък",
  "гора",
  "хълм",
  "облак",
  "поляна",
  "слънце",
  "полянка",
  "птица",
  "поток",
  "пеперуда",
  "храст",
  "роса",
  "прах",
  "поле",
  "огън",
  "цвете"
];

const CREATE_PRODUCT_MUTATION = `
mutation createProduct($title: String,
  $descriptionHtml : String,
  $metafields: [MetafieldInput!],
  $media : [CreateMediaInput!]
) {
  productCreate(input :{
    title: $title,
    descriptionHtml : $descriptionHtml,
    metafields : $metafields,
  },
    media: $media
 ) {
  userErrors {
    field
    message
  }
    product{
      title
      metafields(first:250){
        edges{
          node{
            key
            value
          }
        }
      }
    }
  }
}
`;
const GET_ALL_PRODUCTS_QUERY = `
query shopInfo {
  products(first: 250) {
    edges {
      node {
        title
        id
        descriptionHtml
        metafields(first: 250) { 
          edges {
            node {
              value
              namespace
              key
              id
            }
          }
        }
        images(first:250){
          edges {
            node {
              id
              url
              altText
            }
          }
        }
      }
    }
  }
}`;
const GET_COLLECTION_BY_ID_QUERY = `query getCollectionId($id: ID!) {
  collection(id: $id) {
    id
    title
    handle
  }
}
  `
const GET_SINGLE_PRODUCT_QUERY = `
query getSingleProduct($id : ID!) {
  product(id: $id) {
    id
    title
    descriptionHtml
    metafields(first: 100) {
      edges {
        node {
          id
          namespace
          key
          value
        }
      }
    }
  }
}`;
// const GENERATE_TOC_FOR_PRODUCT_MUTATION = `
// mutation UpdateProduct($id: ID!, $descriptionHtml: String!, $metafieldToc: String!) {
//   productUpdate(
//     input: {
//       id: $id,
//       descriptionHtml: $descriptionHtml,
//       metafields: [
//         {
//           key: "toc",
//           namespace: "custom",
//           value: $metafieldToc,
//         }
//       ]
//     }
//   ) {
//     product {
//       id
//       descriptionHtml
//     }
//     userErrors {
//       field
//       message
//     }
//   }
// }
// `;
const UPDATE_PRODUCT_HTML_AND_METAFIELD_MUTATION = `mutation UpdateProduct($id: ID!, $descriptionHtml: String!, $metafieldId: ID!, $metafieldValue: String!) {
  productUpdate(
    input: {
      id: $id,
      descriptionHtml: $descriptionHtml,
      metafields: [
        {
          id: $metafieldId,
          value: $metafieldValue
        }
      ]
    }
  ) {
    product {
      id
      descriptionHtml
      metafields(first: 100) {
        edges {
          node {
            id
            namespace
            key
            value
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;
// const GET_ALL_CONTENT_FILES_QUERY = `query {
//   files(first: 250) {
//     edges {
//       node {
//         createdAt
//         updatedAt
//         alt
//         ... on MediaImage {
//           id
//           image {
//             id
//             originalSrc: url
//             width
//             height
//             altText
//             url
//           }
//         }
//       }
//     }
//   }
// }

// `;
// const CREATE_FILE_MUTATION = `
// mutation fileCreate($files: [FileCreateInput!]!) {
//   fileCreate(files: $files) {
//     files {
//       alt
//       createdAt
//     }
//   }
// }
// `;
const WRITE_PRODUCTS_QUERY = `
query {
  products(first:250){
    edges{
      node{
        title
        descriptionHtml
        metafields(first:250){
          edges{
            node{
              key
              namespace
              value
            }
          }
        }
       images(first:250) {
         edges {
           node {
            url
            altText
           }
         }
       }
      }
    }
  }
  }
`;
const READ_PRODUCTS_MUTATION = `
mutation createProduct($title: String,
  $descriptionHtml : String,
  $metafields: [MetafieldInput!],
  $media : [CreateMediaInput!]
) {
  productCreate(input :{
    title: $title,
    descriptionHtml : $descriptionHtml,
    metafields : $metafields,
  },
    media: $media
 ) {
    product{
      title
    }
  }
}
`;
const READ_PRODUCTS_METAFIELDS_QUERY = `
{
  metafieldDefinitions(ownerType:PRODUCT, first:250) {
    edges {
      node {
        description
        key
        namespace
        name
        ownerType
        type{
          name
        }  
        validations {
          name
          value
        }
      }
    }
  }
}
`;
const CREATE_PRODUCT_METAFIELD_MUTATION = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}`;
const WRITE_COLLECTIONS_QUERY = `
query {
  collections(first: 250) {
    edges {
      node {
        id
        title
        handle
        sortOrder
        descriptionHtml
        metafieldDefinitions(first:250) {
          edges {
            node {
              name
              namespace
              description
              key
              ownerType   
            }
          }
        } 
        image {
          altText
          url
        }
        metafields(first:250) {
          edges {
            node {
            id
            key
            value
            namespace
            }
          }
        }
        products(first:250) {
          edges {
            node {
              title
              handle  
            }
          }
        }
      }
    }
  }
}
`;
const READ_COLLECTIONS_MUTATION = `
mutation CollectionCreate($input: CollectionInput!) {
  collectionCreate(input: $input) {
    userErrors {
      field
      message
    }
    collection {
      id
      title
      descriptionHtml
      handle
      sortOrder
    metafieldDefinitions(first:250) {
  edges {
    node {
      key
      namespace
      description
      metafields(first:250) {
        edges {
          node {
            value
            key
            namespace
          }
        }
      }
    }
  }
}
    }
  }
}
`
const WRITE_COLLECTIONS_METAFIELD_QUERY = `
{
  metafieldDefinitions(ownerType:COLLECTION, first:250) {
    edges {
      node {
        description
        key
        namespace
        name
        type{
          name
        }  
        ownerType
      }
    }
  }
}
`
const READ_COlLECTIONS_METAFIELDS_MUTATION = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
    }
    userErrors {
      field
      message
      code
    }
  }
}
`
const WRITE_PAGES_QUERY = `
{
  pages(first:250) {
    edges{
      node{
        id
        title
        handle
        body
        templateSuffix
        visible
        visibilityDate
        metafields(first:20){
          edges{
            node{
              description
              key
              namespace
              ownerType
              value
              type
            }
          }
        }
      }
    }
  }
}`

const READ_PAGES_MUTATION = `mutation onlineStorePageCreate($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page {
      body
      id
      handle
      title
    }
    userErrors {
      field
      message
    }
  }
}`

const WRITE_PAGES_METAFIELDS_QUERY = `query {
  metafieldDefinitions(first: 250, ownerType: PAGE) {
    edges {
      node {
        name
        id
        metafields(first:100) {
          edges {
            node {
              key
              ownerType
              namespace
              type
              value
            }
          }
        }
      }
    }
  }
}`

//products FUNCTIONS
export async function productCreator(session, count = DEFAULT_PRODUCTS_COUNT) {
  const client = new shopify.api.clients.Graphql({ session });

  //prime workout
  const htmlString = `<div class="prose prose-2xl text-black mx-auto mt-8 px-8 prose-img:rounded-xl">
  
  <p dir="ltr"><span>Нашата премиум формула за </span><span><strong>хранителна добавка Прайм уъркаут</strong> </span><span>е специално подбрана комбинация от висококачествени натурални съставки, които ще подпомогнат вашата ефикасност по време на </span><strong>тренировъчния процес</strong><span> във физически и психически аспект.</span></p>
<p dir="ltr"><span>За разлика от другите </span><strong>предтренировъчни продукти</strong><span><strong>,</strong> Prime Workout ще ви осигури постоянни нива на енергия и концентрация и ще предостави условия за оптимално възстановяване на вашия организъм.</span></p>
<p dir="ltr"><span>Ефектите от Prime Workout, които ще усетите, засягат различни аспекти от тренировъчния процес и ще ви подготвят за по-тежките последващи тренировки.</span></p>
<h2 dir="ltr"><span>Съдържание на продукта</span></h2>
<p><span><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/prime-workout-opisanie-bilki._480x480.webp?v=1710773939" alt="описание на хранителна добавка prime workout" style="margin-bottom: 16px; float: none;" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/prime-workout-opisanie-bilki._480x480.webp?v=1710773939" data-mce-style="margin-bottom: 16px; float: none;"></span></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Единична доза: 1 капсула.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Количество: 100 капсули.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Опакова за: 50 дни</span></p>
</li>
</ul>
<p dir="ltr"><span>Съдържание в единична доза – 1 капсула (1100 мг.):</span></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Аргинин AKG</strong><span> – 388,5 мг. (35%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Л-Карнитин тартрат</strong><span> – 333 мг. (30%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span><strong>Левзея корен екстракт</strong> </span><span>– 111 мг. (10%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span><strong>Сибирски Женшен екстракт</strong> </span><span>– 111 мг. (10%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Мурсалски чай екстракт </strong><span>– 55,5 мг. (5%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Магарешки бодил екстракт</strong><span><strong> </strong>– 55,5 мг. (5%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span><strong>Зелен чай екстракт</strong> </span><span>– 55,5 мг. (5%)</span></p>
</li>
</ul>
<p dir="ltr"><span>Дневна доза: 2 капсули</span></p>
<p dir="ltr"><span>Съдържание в дневна доза – 2 капсули (2200 мг.):</span></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Аргинин AKG – 777 мг. (35%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Л-Карнитин тартрат – 666 мг. (30%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Левзея корен екстракт – 222 мг. (10%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Сибирски Женшен екстракт – 222 мг. (10%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Мурсалски чай екстракт – 111 мг. (5%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Магарешки бодил екстракт – 111 мг. (5%)</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Зелен чай екстракт – 111 мг. (5%)</span></p>
</li>
</ul>
<div style="text-align: left;"><img loading="lazy" width="480" height="480" decoding="async" style="margin-bottom: 16px; float: none;" alt="" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/detoks-prilojenie_1_480x480.webp?v=1704872472"></div>
<p dir="ltr"><strong>Предлагаме чиста и естествена подкрепа за вашето здраве:</strong></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>100% активни съставки</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Вегетарианска формула</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Без глутен</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Без лактоза</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Без добавена захар</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Без консерванти и изкуствени оцветители</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Не е тестван върху животни.</span></p>
</li>
</ul>
<h2 dir="ltr"><span>Препоръки за прием</span></h2>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/nachin-na-priem-hranitelna-dobavka_480x480.webp?v=1704896462" alt="начин на прием prime workout" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/nachin-na-priem-hranitelna-dobavka_480x480.webp?v=1704896462"></span></span></p>
<h3 dir="ltr"><span>Препоръчителен дневен прием</span></h3>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Две (2) капсули, 45-60 мин. преди тренировка.</span></p>
</li>
</ul>
<h3 dir="ltr"><span>Препоръчителен период на прием&nbsp;</span></h3>
<p dir="ltr"><span>За максимални резултати е добре да се приема до 3 месеца (12 седмици). След период на почивка от около 2 седмици, цикълът може да се повтори.</span></p>
<h3 dir="ltr"><span>Други препоръки</span></h3>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Само за перорално приложение.&nbsp;</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Да не се превишава препоръчителната дневна доза.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Да не се приема от бременни и кърмещи жени.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Продуктът не е заместител на разнообразното хранене.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Продуктът не е лекарствено средство, а хранителна добавка.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Консултирайте се с вашия личен лекар преди прием.</span></p>
</li>
</ul>
<h2 dir="ltr"><span>За кого е подходяща добавката Прайм уъркаут?</span></h2>
<div style="text-align: left;" data-mce-style="text-align: left;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/levzeya-hranitelna-dobavka-za-sportisti_480x480.webp?v=1708439657" alt="хранителна добавка prime workout за кого е подходящ" style="margin-bottom: 16px; float: none;" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/levzeya-hranitelna-dobavka-za-sportisti_480x480.webp?v=1708439657" data-mce-style="margin-bottom: 16px; float: none;"></div>
<p dir="ltr"><span>Продуктът “Prime Workout” е подходящ за приемане от всеки, който извършва интензивни физически натоварвания и е превърнал спорта и състезанието със собствените си възможности в начин на живот.</span></p>
<p dir="ltr"><span>Подходящ е както за стимулиране на фокуса и силата на ума, така и за оптимизиране на процесите, протичащи в мускулите по време на тренировки.</span></p>
<p dir="ltr"><span>Ползи от този продукт биха имали и хора, които имат твърде динамичен и стресиращ начин на живота, извършващи умствена работа или подложени на голям психо-емоционален стрес.</span></p>
<p dir="ltr"><span>Доверието на нашите клиенти е важно за нас. Поради това всеки продукт разполага с регистрационен номер, издаден от Агенцията, отговорна за контрола над храните и хранителни добавки, с който се верифицира неговата автентичност и качество: </span><span>Т032400081</span></p>
<h2 dir="ltr"><span>GMP сертификат&nbsp;</span></h2>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/gmp-certified._480x480.webp?v=1702470589" alt="gmp prime workout" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/gmp-certified._480x480.webp?v=1702470589"></span></span></p>
<p dir="ltr"><span>GMP сертификат - Добрата производствена практика - представлява златния стандарт в </span><strong>производството на хранителни добавки.</strong></p>
<p dir="ltr"><span>Продуктите на VitaOn се произвеждат, спазвайки стриктно производствените процеси и налагайки строг контрол във всеки етап, гарантирайки </span><strong>високо качество и безопасност.</strong></p>
<p dir="ltr"><span>GMP сертификатите са своеобразно доказателство за отдадеността на компанията ни, да ви предоставя само първокласни </span><strong>премиум продукти.</strong></p>
<p dir="ltr"><span>Ние поставяме като приоритети постоянството, точността и чистотата и по този начин ви предлагаме спокойствие и доверие, за които носим отговорност.</span></p>
<h2 dir="ltr">
<span>Описание на Prime Workout</span><span></span><span></span>
</h2>
<p dir="ltr"><span>“Prime Workout” представлява уникална по рода си формула и </span><strong>хранителна добавка</strong><span>, която съчетава в себе си две натурални аминокиселини и пет растения, които имат доказани качества за човешкото тяло.</span></p>
<p dir="ltr"><span>Комбинацията е изключително интересна поради това, че адресира двата най-важни аспекта на всяка тренировка - физическия и нервно-психическия.</span></p>
<p dir="ltr"><span>Същността на тренировъчния процес представлява да научим мозъка и волята си да поставят все по-трудни препятствия пред нашето тяло и по този начин да подобряваме </span><strong>физическата си форма</strong><span>. Това ангажира изключително нашата нервна система и скелетно-мускулния ни апарат.&nbsp;</span></p>
<p dir="ltr"><span>Поради това възстановителните процеси трябва да са адекватни и реципрочни според натоварването.</span></p>
<p dir="ltr"><span>Комбинацията от съставки в нашия продукт дава на тялото ни необходимото, за да може да даде всичко от себе си във физическия аспект. Съчетанието от </span><strong>адаптогенни и стимулиращи билки</strong><span> правят това възможно.&nbsp;</span></p>
<p dir="ltr"><span>“Prime Workout” съдържа аминокиселината Аргинин и непротеиновата аминокиселина с витаминна природа Л-карнитин.</span></p>
<p dir="ltr"><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/prime-workout_480x480.webp?v=1702302790" alt="primeworkout infografika" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/prime-workout_480x480.webp?v=1702302790"></span></span></p>
<p dir="ltr"><strong>В него се съдържат и няколко растения с доказан ефект:</strong></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Аргинин AKG</strong><span> - има съдоразширяващ ефект, подпомага храненето на мускулите и допринася за “напомпващия ефект”.</span></p>
</li>
</ul>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Л-Карнитин тартрат</strong><span> - аминокиселина с витаминна природа, отговорен за синтеза на енергия в клетките и повишаващ издръжливостта.</span></p>
</li>
</ul>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Левзея корен екстракт </strong><span>- адаптогенна билка за която се твърди, че повишава протеиновия синтез, силата, мускулната маса и либидото при мъжа.</span></p>
</li>
</ul>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Сибирски женшен екстракт</strong><span> - адаптогенна билка, която подобрява концентрацията и нормализира нивата на стресовия хормон кортизол.</span></p>
</li>
</ul>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Мурсалски чай екстракт</strong><span> - отново адаптогенна билка, известна като българската виагра. Повишава тонуса и чувството за сила, има качества на афродизиак.</span></p>
</li>
</ul>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><strong>Магарешки бодил екстракт</strong><span><strong> </strong>- притежава възбуждащ ефект върху нервната система и стимулира сърдечната дейност.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span><strong>Зелен чай екстракт</strong> </span><span>- енергетик, антиоксидант, притежава стимулиращо действие върху централната нервна система (ЦНС).</span></p>
</li>
</ul>
<h2 dir="ltr"><span>Ползи от приема на Prime Workout</span></h2>
<p dir="ltr"><span>Ползите от приема на този иновативен и изцяло</span><span> <strong>натурален предтренировъчен продукт</strong> </span><span>са множество. Те не се ограничават само до търсения напомпващ ефект от обикновените продукти от този тип.&nbsp;</span></p>
<p dir="ltr"><span>Благодарение на </span><a href="https://vitaon.bg/collections/bilkovi-tinkturi" data-mce-href="https://vitaon.bg/collections/bilkovi-tinkturi"><span>билковите екстракти</span></a><span>, включени в Prime Workout, се наблюдават различни ползи за цялостното здраве и благосъстояние на нашия организъм.</span></p>
<p dir="ltr"><span>Те се дължат на различните компоненти и активни вещества, които подпомагат действието си едно на друго и засилват цялостния ефект от </span><strong>приема на добавката</strong><span>. Изборът на тези съставки е ръководен именно от холистичния принцип, който се стреми да засегне всички аспекти на здравето, свързани с </span><strong>усилените тренировки.</strong></p>
<h3 dir="ltr"><span>Ползи от Л- аргинин в Прайм уъркаут</span></h3>
<p><span><img loading="lazy" width="480" height="480" decoding="async" style="margin-bottom: 16px; float: none;" alt="prime workout за енергия" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/hranitelni-dobavki-za-energiya._480x480.webp?v=1710772211" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/hranitelni-dobavki-za-energiya._480x480.webp?v=1710772211" data-mce-style="margin-bottom: 16px; float: none;"></span></p>
<h4 dir="ltr"><span>Имунна система и анаболни процеси</span></h4>
<p dir="ltr"><span>Л-аргинин е </span><strong>незаменима аминокиселина</strong><span>, която тялото ни не може да синтезира и си я набавя чрез храната, която поемаме.</span></p>
<p dir="ltr"><span>Л-аргинин е прекурсор на азотния оксид. Тази молекула има редица роли в човешкото тяло. Отговаря за клетъчната сигнализация между клетките на имунната система и регулира имунния отговор.</span></p>
<p dir="ltr"><span>Той влиза в състава на протеините и участва в анаболните процеси.</span></p>
<h4 dir="ltr"><span>Креатин и АТФ</span></h4>
<p dir="ltr"><span>Освен това е една от трите аминокиселини, от които се образува </span><strong>креатинът</strong><span>. Креатинът, под неговата активна форма креатин фосфат, е енергоносеща молекула отговорна за синтеза на АТФ.&nbsp;</span></p>
<p dir="ltr"><span>Особено нужен е по време на</span><span> <strong>физическо натоварване</strong></span><span>, където служи за отдаване на фосфатна група към молекулата на Аденозин дифосфат, превръщайки го в АТФ.</span></p>
<p dir="ltr"><span><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/izdrujlivost-energiq_480x480.webp?v=1705309006" alt="prime workout за повече енергия" style="margin-bottom: 16px; float: none;" data-mce-style="margin-bottom: 16px; float: none;" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/izdrujlivost-energiq_480x480.webp?v=1705309006"></span></p>
<h4 dir="ltr"><span>Кръвоносни съдове</span></h4>
<p dir="ltr"><span>Азотният окис освен като клетъчен сигнализатор изпълнява ролята и на мощен </span><span><strong>вазодилататор</strong> </span><span>- това означава, че той има способността да разширява кръвоносните съдове. По този начин се осъществява повишаване на кръвотока в скелетната мускулатура.</span></p>
<p dir="ltr"><strong>Това води до:</strong></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Засилен транспорт на глюкоза и аминокиселини в мускулните клетки, което подпомага анаболитните и възстановителните процеси.</span></p>
</li>
</ul>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Повишено активно отделяне на токсични продукти от мускулните клетки, които са отговорни за мускулната умора и намаляване на силата, а именно млечната киселина.</span></p>
</li>
</ul>
<p dir="ltr"><span>В резултат имаме по-здрави, по-издръжливи и по-силни мускули, които могат да преодоляват по-тежки и интензивни натоварвания.</span></p>
<h4 dir="ltr"><span>Хормон на растежа</span></h4>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" alt="действие на л аргинин тостесторен" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/povishen-testosteron-vitaon....._480x480.webp?v=1707831794" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/povishen-testosteron-vitaon....._480x480.webp?v=1707831794"></span></span></p>
<p dir="ltr"><span>Съществуват проучвания, които доказват, че приемът на аминокиселината през устата може да доведе до повишение в </span><span><strong>серумните нива на хормона на растежа</strong> </span><span>до 100%. В същото проучване, нивата на хормон на растежа при физически натоварвания, съчетани с прием на Л-аргинин, може да се повиши от 300 до 500%.</span></p>
<p dir="ltr"><span>Това са статистически значими последствия от приема на аминокиселината. Хормонът на растежа е отговорен за мускулния растеж и метаболизма на хранителни вещества. Повишените стойности около физически стимули води до </span><strong>подобряване на спортните постижения</strong><span>, нарастване на мускулната маса и по-добро възстановяване.</span></p>
<h3 dir="ltr"><span>Ползи от Л-карнитин в Прайм уъркаут</span></h3>
<div style="text-align: left;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/l-karnitin-hranitelna-dobavka-v-stak_480x480.webp?v=1709110213" alt="l-carnitine за спортисти" style="margin-bottom: 16px; float: none;"></div>
<p dir="ltr"><span>Л-карнитин е вещество с аминокиселинна природа, което не се включва в състава на белтъчините. По същество представлява </span><strong>витамин.</strong></p>
<p dir="ltr"><span>Той е условно незаменим, което ще рече, че освен при определени условия, нуждите на организма ни от Л-карнитин никога не превъзхождат способността на тялото ни да го синтезира.</span></p>
<p dir="ltr"><span>Разбира се, това не означава, че допълнителния му прием е излишен.&nbsp;</span></p>
<p dir="ltr"><span>За да извлечем ползите от него, свързани със </span><strong>спорта</strong><span>, ни трябват по-големи количества, които да повишават концентрацията му в плазмата. Това не може да се случи, ако оставим на организма ни сам да го произведе.</span></p>
<p dir="ltr"><span>Основната роля на това вещество е да участва в процесите, свързани с </span><span><strong>обмен на енергия</strong> </span><span>и по-скоро изгарянето на енергия.&nbsp;</span></p>
<p dir="ltr"><span>Той служи като транспорт на мастните киселини до митохондриите, където се подлагат на процес на окисление и се разграждат до лесно усвоима енергия.</span></p>
<p dir="ltr"><span>Особено ефективен е върху</span><span> <strong>физическото представяне</strong> </span><span>при хора, практикуващи спортове, свързани с издръжливост - бягане, плуване, колоездене.</span></p>
<p dir="ltr"><span>Подобрява </span><strong>мускулната издръжливост</strong><span> при аеробни натоварвания и ускорява метаболизма.</span></p>
<h3 dir="ltr"><span>Ползи от левзея в Прайм уъркаут</span></h3>
<div style="text-align: left;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/psihichno-zdrave._480x480.webp?v=1704461972" alt="ползи от левзея" style="margin-bottom: 16px; float: none;"></div>
<p dir="ltr"><span>Левзеята е </span><strong>адаптогенна билка</strong><span>, разпространена най-вече в Сибир, Северна Русия и Казахстан. Коренът ѝ е богат на активни вторични метаболити. Най-известните от тях са от групата на сапонините - бета-екдистерона.</span></p>
<p dir="ltr"><span>На него дължим ефектите на билката върху тялото ни. Те са разнообразни - помага ни да се справяме със стреса - както физическия, така и психо-емоционалния.&nbsp;</span></p>
<p dir="ltr"><span>Освен това Левзеята е мощен афродизиак и се счита, че подобрява половата мощ.</span></p>
<p dir="ltr"><span>Липсват убедителни проучвания, но все пак съществуват данни,че приемът ѝ води до </span><a href="https://vitaon.bg/collections/hranitelni-dobavki-muskulna-masa" data-mce-href="https://vitaon.bg/collections/hranitelni-dobavki-muskulna-masa"><span>нарастване на мускулната маса</span></a><span>, увеличаване на анаболния синтез, както и подобряване на силовата издръжливост.</span></p>
<p dir="ltr"><span>Левзеята съдържа в себе си вторични метаболити, които имат изразени антиоксидантни свойства и допринасят за деактивирането на свободните радикали, които са плод от мускулния метаболизъм.</span></p>
<h3 dir="ltr"><span>Ползи от Сибирски женшен в Прайм уъркаут</span></h3>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" alt="сибирски жен шен корен" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/jen-shen-koren_480x480.webp?v=1705048986" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/jen-shen-koren_480x480.webp?v=1705048986"></span></span></p>
<p dir="ltr"><span>Сибирският женшен е лечебно растение, чиито качества са световноизвестни и признати.</span></p>
<p dir="ltr"><span>Той е богат на активни вторични метаболити, които участват в редица процеси, извършвани в </span><strong>човешкото тяло</strong><span>. Те са причината за полезните свойства на билката върху организма ни.</span></p>
<p dir="ltr"><strong>Някои от най-изявените ползи включват:</strong></p>
<ul>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Счита се, че Сибирският женшен е мощен адаптоген. Помага при справяне със стресови ситуации и потиска нивата на кортизола.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Регулира </span><strong>енергийните нива</strong><span> и ги разпределя правилно, за да може да подсигури плавен приток на енергия, без пикове и спадове, както е характерно за стимулантите.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Той притежава силно антиоксидантно действие и се използва като</span><span> </span><a href="https://vitaon.bg/collections/bilki-otslabvane-detoksikaciya" data-mce-href="https://vitaon.bg/collections/bilki-otslabvane-detoksikaciya"><span>билка за детоксикиране на тялото</span></a><span>, както и за подобряване на средата за извършване на физиологични процеси.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Съществуват данни, че тази билка играе роля в хомеостазата на половите хормони, като приемът му води до повишаване на нивата на свободния тестостерон.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Женшенът помага на организма ни да работи в екстремни условия. Той има положително влияние върху ЦНС. Регулира настроението и фокуса, подобрява когнитивните способности.</span></p>
</li>
<li dir="ltr" aria-level="1">
<p dir="ltr" role="presentation"><span>Ефективен е за употреба от </span><strong>спортисти</strong><span>, повишава мускулната издръжливост и подобрява притока на кръв към мозъка и към крайниците ни.</span></p>
</li>
</ul>
<h3 dir="ltr"><span>Ползи от Мурсалски чай в Прайм уъркаут</span></h3>
<p><span><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/mursalski-chai-opisanie.._480x480.webp?v=1710830530" alt="мурсалски чай описание" style="margin-bottom: 16px; float: none;" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/mursalski-chai-opisanie.._480x480.webp?v=1710830530" data-mce-style="margin-bottom: 16px; float: none;"></span></p>
<p dir="ltr"><span>Известен под името Българската виагра, този представител на родната ни флора и билкова аптека се счита за мощен афродизиак.</span></p>
<p dir="ltr"><span>Според народната медицина, тази билка </span><strong>увеличава сексуалното желание</strong><span>, половата мощ и фертилитета.</span></p>
<p dir="ltr"><span>Това растение притежава мощни </span><strong>антиоксидантни свойства</strong><span> и помага на организма ни в борбата с оксидативния стрес. Вероятно именно това действие е отговорно за силните му адаптогенни свойства.</span></p>
<p dir="ltr"><span>Счита се, без да са налични сигнификантни литературни доказателства, че билката понижава нивата на кортизола (хормона на стреса) и има благоприятно влияние върху глюкозния метаболизъм.</span></p>
<p dir="ltr"><span>Мурсалския чай е наричан още Родопско чудо и се употребява в планинските райони на България почти като панацея.</span></p>
<p dir="ltr"><strong>Енергизира тялото и духа</strong><span> и помага за възстановителните процеси в организма.</span></p>
<h3 dir="ltr"><span>Ползи от магарешки бодил в Прайм уъркаут</span></h3>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/magareshki-bodil_480x480.webp?v=1705044207" alt="магарешки бодил действие" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/magareshki-bodil_480x480.webp?v=1705044207"></span></span></p>
<p dir="ltr"><span>Магарешкият бодил е двугодишно растение, което вероятно всеки от нас е виждал. Вирее по поляни, пасища и ливади. Предпочита директна слънчева светлина.</span></p>
<p dir="ltr"><span>В народната медицина това лечебно растение се препоръчва за </span><a href="https://vitaon.bg/collections/dobavki-vitamini-otpadnalost-umora" data-mce-href="https://vitaon.bg/collections/dobavki-vitamini-otpadnalost-umora"><span>тонизиране и енергизиране на организма</span></a><span>. Приема се при кашлица, синузити и бронхити, където показва добро секретолитично и отхрачващо действие.</span></p>
<p dir="ltr"><span>Билката има общоукрепващо и имуностимулиращо действие, притежава диуретичен ефект и предпазва сърдечния мускул и бъбреците. Помага при артериална хипертония.</span></p>
<p dir="ltr"><span>В бодибилдинг средите, магарешкият бодил се счита за растение, което притежава </span><strong>анаболно действие</strong><span>, подпомагащо синтеза на протеини. Това действие се обяснява със съдържанието му на сапонини - растителни вещества, подобни на стероидите.</span></p>
<p dir="ltr"><span>Подобрява </span><strong>възстановяването на мускулите</strong><span> след тренировка и ги подготвя за по-тежки натоварвания.</span></p>
<p dir="ltr"><span>Магарешкият бодил има възбуждащо действие върху ЦНС, като я подготвя за периоди на интензивни натоварвания.</span></p>
<h3 dir="ltr"><span>Ползи от зелен чай в Прайм уъркаут</span></h3>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/zelen-chai-deistvie_480x480.webp?v=1705048298" alt="зелен чай действие" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/zelen-chai-deistvie_480x480.webp?v=1705048298"></span></span></p>
<p dir="ltr"><span>Зеленият чай е растение, притежаващо редица ползи за човешкото здраве. Интересен факт за него е, че той е втората най-употребявана напитка след водата в цял свят.</span></p>
<p dir="ltr"><span>Има много сортове зелен чай, но всички те се отличават със високото съдържание на полифенолни съединения, флавоноиди, катехини и кофеин.</span></p>
<p dir="ltr"><span>Зеленият чай е </span><a href="https://vitaon.bg/collections/antioksidanti" data-mce-href="https://vitaon.bg/collections/antioksidanti"><span>мощен антиоксидант</span></a><span> и детоксикиращ агент. Участва активно в борбата със свободните радикали и оксидативния стрес.</span></p>
<p dir="ltr"><span>Наличието на кофеин в него допринася за стимулаторното му въздействие върху нервната система, като повишава фокуса преди физически натоварвания.</span></p>
<p dir="ltr"><span>Има силен</span><span> <strong>енергизиращ ефект</strong></span><span>, като освен това катехините в него имат термогенно действие. Повишава метаболизма и мобилизира липидните и гликогенни запаси към митохондриите, където да бъдат разградени и преобразувани в енергия.</span></p>
<h2 dir="ltr"><span>Какви са предимствата на Prime Workout на ВитаОн?</span></h2>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/prime-workout-zakluchenie._480x480.webp?v=1704974177" alt="заключение prime workout" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/prime-workout-zakluchenie._480x480.webp?v=1704974177"></span></span></p>
<p dir="ltr"><span>Продуктът ‘’Prime Workout” е иновативен по своето съдържание, защото комбинира ефектите на две важни за тялото ни и тренировъчния процес аминокиселини с действието на естествени адаптогенни билки.</span></p>
<p dir="ltr"><span>Резултатът, който “PrimeWorkout” ще ни помогне да постигнем, е да повиши нужната концентрация и мотивация, за да подобрим </span><strong>постиженията си в спорта</strong><span> и всеки път да бъдем по-добри от предходния.</span></p>
<p dir="ltr"><span>Приемът му ще засили темповете на нужните за възстановяването ни анаболни процеси и ще оптимизира елиминирането на токсините от мускулите.</span></p>
<p dir="ltr"><span>Този продукт не е типичната </span><strong>предтренировъчна добавка</strong><span>, която е пренаситена от стимуланти, които да натоварят допълнително нашата нервна система. Ние вярваме в постоянството и в системните резултати, стъпка по стъпка.&nbsp;</span></p>
<p dir="ltr"><span>Затова енергията, която ще ви даде “Prime Workout” ще бъде плавна и постоянна, без пикове и спадове, и ще държи нашата нервна система в кондиция, за да може бързо да се възстановим между отделните натоварвания и да бъдем все по-ефективни.</span></p>
<h2 dir="ltr"><span>Често задавани въпроси</span></h2>
<p><span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"><img loading="lazy" width="480" height="480" decoding="async" src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/chesto-zadavani-vuprosi._480x480.webp?v=1705409243" alt="въпроси prime workout" data-mce-src="https://cdn.shopify.com/s/files/1/0779/3383/8663/files/chesto-zadavani-vuprosi._480x480.webp?v=1705409243"></span></span></p>
<h3 dir="ltr"><span>Здравословно ли е да се приемат предтренировъчни продукти, какъвто е "Prime Workout" ?&nbsp;</span></h3>
<p dir="ltr"><span>За разлика от други предтренировъчни продукти, в нашата добавка наличието на стимуланти (кофеин) е с изцяло естествен произход (съдържа се в зеления чай) в дози, които са напълно безопасни. Освен това съдържанието на адаптогенни билки и натурални съставки правят "Prime Workout" здравословен продукт, подходящ както за спортисти, така и за хора, които имат динамично ежедневие.</span></p>
<h3 dir="ltr"><span>Може ли да приемам "Prime Workout" след хранене?&nbsp;</span></h3>
<p dir="ltr"><span>Прайм уъркаут, макар и по-различен от конкурентни продукти, е добре да се приема на гладно преди тренировка. Ако все пак приемате продукта след хранене, ще отнеме повече време да усетите ползите от него поради предимно билковата му природа. По този начин вие няма да може да се възползвате от непосредствения ефект, който имат някои от съставките.</span></p>
<h3 dir="ltr"><span>Какво да очаквам от приема на Prime Workout?</span></h3>
<p dir="ltr"><span>Приемът на хранителната добавка ще подобри вашата концентрация и мотивация по време на тренировъчния процес, ще увеличи силата и издръжливостта ви и ще ви накара да се почувствате по-енергични.</span><span style="font-weight: 400;" data-mce-style="font-weight: 400;"></span></p>
  


  </div>`;

  try {
    const res = await client.query({
      data: {
        query: CREATE_PRODUCT_MUTATION,
        variables: {
          title: `${randomTitle()}`,
          descriptionHtml: htmlString,
          metafields: [
            {
              key: "toc",
              namespace: "custom",
              value: "no toc",
            },
            // {
            //   key: "cars",
            //   namespace: "vehicle",
            //   value: "carsss!",
            // },
          ],
          media: [
            {
              alt: "kurtest",
              mediaContentType: "IMAGE",
              originalSource:
                "https://vitaon.bg/cdn/shop/files/prime-workout.webp?v=1702302790&amp;width=480",
            },
          ],
        },
      },
    });

    console.log(res.body.data.productCreate.product.metafields.edges);
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(
        `${error.message}\n${JSON.stringify(error.response, null, 2)}`
      );
    } else {
      throw error;
    }
  }
}

export async function getAllProducts(session) {
  const client = new shopify.api.clients.Graphql({ session });

  try {
    const response = await client.query({
      data: {
        query: GET_ALL_PRODUCTS_QUERY,
      },
    });

    const products = response.body.data.products.edges;

    const allProducts = [];

    products.forEach((product) => {
      if (
        product.node.metafields.edges.some(
          (metafield) =>
            metafield.node.key == "toc" && metafield.node.value == "no toc"
        )
      ) {
        allProducts.push({
          title: product.node.title,
          id: product.node.id.split("Product/")[1],
          descriptionHtml: product.node.descriptionHtml,
          isTocGenerated: false,
        });
      } else {
        allProducts.push({
          title: product.node.title,
          id: product.node.id.split("Product/")[1],
          descriptionHtml: product.node.descriptionHtml,
          isTocGenerated: true,
        });
      }
    });

    return allProducts;
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(
        `${error.message}\n${JSON.stringify(error.response, null, 2)}`
      );
    } else {
      throw error;
    }
  }
}

export async function editProductToc(product_gid, product_body_html) {
  const session = {
    id: "offline_dimitar-shop-app-test.myshopify.com",
    shop: "dimitar-shop-app-test.myshopify.com",
    state: "740419230191843",
    isOnline: false,
    scope: "write_products",
    accessToken: "shpua_ef480e93938516d6e006c66d234bcae4",
  };
  const client = new shopify.api.clients.Graphql({ session: session });

  const product_info = await client.query({
    data: {
      query: GET_SINGLE_PRODUCT_QUERY,
      variables: {
        id: product_gid,
      },
    },
  });

  let product_metafield_id = "";

  product_info.body.data.product.metafields.edges.some((edge) => {
    if (edge.node.key == "toc") {
      product_metafield_id = edge.node.id;
    }
  });

  const product_descriptionHtml =
    product_info.body.data.product.descriptionHtml;
  const product_id = product_info.body.data.product.id;

  if (product_metafield_id != "") {
    const toc = createToc(product_descriptionHtml);
    const generateProductDescription = createProductDescription(
      product_descriptionHtml
    );

    await client.query({
      data: {
        query: UPDATE_PRODUCT_HTML_AND_METAFIELD_MUTATION,
        variables: {
          id: product_id,
          descriptionHtml: `${generateProductDescription}`,
          metafieldId: product_metafield_id,
          metafieldValue: toc.tocHtml,
        },
      },
    });
  }
}

export async function writeProducts(session) {
  const client = new shopify.api.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: WRITE_PRODUCTS_QUERY,
    },
  });

  const productsInfo = [];

  response.body.data.products.edges.forEach((product) => {
    const title = product.node.title;
    const descriptionHtml = product.node.descriptionHtml;
    const metafields = [];
    product.node.metafields.edges.forEach((metafield) => {
      metafields.push({
        key: metafield.node.key,
        namespace: metafield.node.namespace,
        value: metafield.node.value,
      });
    });
    const images = [];
    product.node.images.edges.forEach((image) => {
      images.push({
        originalSource: image.node.url,
        alt: image.node.altText,
        mediaContentType: "IMAGE",
      });
    });

    productsInfo.push({
      title: title,
      descriptionHtml: descriptionHtml,
      metafields: metafields,
      images: images,
    });
  });

  try {
    // await writeToFile(productsInfo, "Products.txt");
    return productsInfo
    // console.log("Products writing completed successfully.");
  } catch (error) {
    console.error("Failed to write products:", error);
  }
}

export async function readProducts(session, products) {

  if (!Array.isArray(products)) {
    console.error('Products is not an array:', products);
    return;
  }

  const client = new shopify.api.clients.Graphql({ session });

  for (const product of products) {
    try {
      const response = await client.query({
        data: {
          query: READ_PRODUCTS_MUTATION,
          variables: {
            title: product.title,
            descriptionHtml: product.descriptionHtml,
            metafields: product.metafields,
            media: product.images,
          },
        },
      });
      if (response.errors) {
        console.error('GraphQL Error:', response.errors);
      } else {
        console.log(`Product ${product.title} created successfully.`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
    }
  }
}

export async function writeProductsMetafields(session) {
  const client = new shopify.api.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: READ_PRODUCTS_METAFIELDS_QUERY,
    },
  });

  const metafields = response.body.data.metafieldDefinitions.edges;

  const productsMetafields = [];

  metafields.forEach((metafield) => {

    const validations = []
    if (metafield.node.validations) {
      metafield.node.validations.forEach((validation) => {
        validations.push(validation)
      })
    }

    productsMetafields.push({
      description: metafield.node.description,
      key: metafield.node.key,
      namespace: metafield.node.namespace,
      name: metafield.node.name,
      type: metafield.node.type.name,
      ownerType: metafield.node.ownerType,
      validations: validations
    });
  });

  const hasTocMetafield = productsMetafields.filter((metafield) => metafield.key == "toc")

  if (!hasTocMetafield || hasTocMetafield.length == 0) {
    productsMetafields.push({
      description: "Table of contents",
      key: "toc",
      namespace: "namespace",
      name: "Table of content metafield",
      type: "multi_line_text_field",
      "ownerType": "PRODUCT"
    })
    console.log('added TOC to products metafields');
  }

  try {
    // await writeToFile(productsMetafields, "Metafield_Definitions-Products.txt");
    return productsMetafields
    // console.log(`${productsMetafields.length} Products Metafields exported successfully`);
  } catch (error) {
    console.error("Failed to write products:", error);
  }
}

export async function readProductsMetafields(session, metafields) {
  if (!Array.isArray(metafields)) {
    console.error('Metafields is not an array:', metafields);
    return;
  }

  const client = new shopify.api.clients.Graphql({ session });

  for (const metafield of metafields) {
    // metafield CAN'T start with shopify 
    if (metafield.namespace.startsWith("shopify--")) {
      console.log('skipping invalid metafield!');
    }
    //metafield CAN'T create namespace and key reviews.rating
    else if (metafield.key == 'rating' && metafield.namespace == 'reviews' || metafield.key == 'rating_count' && metafield.namespace == 'reviews') {
      console.log('skipping invalid metafield!');
    }
    else {
      try {
        const response = await client.query({
          data: {
            query: CREATE_PRODUCT_METAFIELD_MUTATION,
            variables: {
              definition: {
                name: metafield.name,
                namespace: metafield.namespace,
                key: metafield.key,
                description: metafield.description,
                type: metafield.type,
                ownerType: metafield.ownerType,
                validations: metafield.validations
              }
            },
          },
        });

        if (response.body.data.metafieldDefinitionCreate.userErrors.length > 0) {
          console.error('GraphQL Error:', response.body.data.metafieldDefinitionCreate.userErrors);
        } else {
          const createdMetafield = response.body.data.metafieldDefinitionCreate.createdDefinition
          console.log(`Product Metafield with name: ${createdMetafield.name}, namespace: ${createdMetafield.namespace}, key: ${createdMetafield.key}, id: ${createdMetafield.id} created successfully!`);
        }
      } catch (error) {
        console.error('Error creating product metafield:', error);
      }
    }
  }
}

//collections FUNCTIONS
export async function writeCollections(session) {
  const client = new shopify.api.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: WRITE_COLLECTIONS_QUERY,
    },
  });

  const collections = response.body.data.collections.edges;

  const allCollections = [];


  for (let collection of collections) {
    const metafieldDefinitions = []
    const productsAddedToCollection = []

    collection.node.products.edges.forEach((product) => {
      productsAddedToCollection.push({
        title: product.node.title,
        handle: product.node.handle
      })
    })

    for (let metafield of collection.node.metafields.edges) {
      const collectionMetafieldLinks = []
      if (metafield.node.key == 'links') {
        const collectionsIds = JSON.parse(metafield.node.value)

        for (let collectionId of collectionsIds) {
          try {
            const response = await client.query({
              data: {
                query: GET_COLLECTION_BY_ID_QUERY,
                variables: {
                  id: collectionId
                },
              },
            });

            collectionMetafieldLinks.push({
              title: response.body.data.collection.title,
              handle: response.body.data.collection.handle
            })

            if (response.errors) {
              console.error('GraphQL Error:', response.errors);
            } else {
              console.log(`Collection Link Handle created successfully.`);
            }
          } catch (error) {
            console.error('Error adding Link Handle', error);
          }
        }

        metafieldDefinitions.push({
          key: metafield.node.key,
          namespace: metafield.node.namespace,
          collectionLinks: collectionMetafieldLinks
        })
      } else {
        metafieldDefinitions.push({
          key: metafield.node.key,
          namespace: metafield.node.namespace,
          value: metafield.node.value,
        })
      }
    }
    allCollections.push({
      title: collection.node.title,
      handle: collection.node.handle,
      sortOrder: collection.node.sortOrder,
      descriptionHtml: collection.node.descriptionHtml,
      image: {
        altText: collection.node.image.altText,
        src: collection.node.image.url
      },
      metafields: metafieldDefinitions,
      collectionProducts: productsAddedToCollection
    });
  }
  try {
    // await writeToFile(allCollections, "Collections.txt");
    return allCollections
    // console.log("Collections writing completed successfully.");
  } catch (error) {
    console.error("Failed to write collections:", error);
  }
}

export async function readCollections(session, collections) {

  if (!Array.isArray(collections)) {
    console.error('Collections is not an array:', collections);
    return;
  }

  const client = new shopify.api.clients.Graphql({ session });

  const GET_PRODUCT_BY_HANDLE = `query getProductIdFromHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
    }
  }`

  const GET_COLLECTION_BY_HANDLE = `query getCollectionIdFromHandle($handle: String!) {
  collectionByHandle(handle: $handle) {
    id
  }
}`

  const ADD_PRODUCTS_TO_COLLECTION = `mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection {
        id
        title
        products(first: 10) {
          nodes {
            id
            title
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }`

  const UPDATE_COLLECTION_METAFIELD_VALUE = `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      namespace
      value
      createdAt
      updatedAt
    }
    userErrors {
      field
      message
      code
    }
  }
}`

  const testImage = {
    altText: 'Testtt',
    src: 'https://vitaon.bg/cdn/shop/files/prime-workout.webp?v=1702302790&amp;width=480'
  }

  let collectionId = ''

  for (const collection of collections) {
    const productsIdsForCurrentCollection = []
    //1.get the products id from their handle
    for (const product of collection.collectionProducts) {
      try {
        const response = await client.query({
          data: {
            query: GET_PRODUCT_BY_HANDLE,
            variables: {
              handle: product.handle
            },
          },
        });
        productsIdsForCurrentCollection.push(response.body.data.productByHandle.id);
        console.log(`product id ${response.body.data.productByHandle.id} pushed successfully`);
      } catch (error) {
        console.log("failed pushing product id", error);
      }
    }
    //2.create the collection and get its id
    let filteredMetafields = collection.metafields.filter(metafield => metafield.key !== 'links');
    try {
      const res = await client.query({
        data: {
          query: READ_COLLECTIONS_MUTATION,
          variables: {
            input: {
              title: collection.title,
              descriptionHtml: collection.descriptionHtml,
              // image : collection.image,
              image: testImage,
              // metafields: collection.metafields
              metafields: filteredMetafields
            }
          },
        },
      });
      collectionId = res.body.data.collectionCreate.collection.id
      console.log(`collection with id: ${res.body.data.collectionCreate.collection.id} created successfully`);
    } catch (error) {
      console.log("error creating file", error);
    }
    //3.add the products to the collection
    try {
      await client.query({
        data: {
          query: ADD_PRODUCTS_TO_COLLECTION,
          variables: {
            id: collectionId,
            productIds: productsIdsForCurrentCollection
          },
        },
      });
      console.log('products added to collection successfully');
    } catch (error) {
      console.log("failed to add products to collection", error);
    }
  }

  const response = await client.query({
    data: {
      query: WRITE_COLLECTIONS_QUERY,
    },
  });

  const collectionsIdsAndHandles = []
  let linksMetafieldId = ""

  //1.get the metafield key LINKS's ID
  for (const collection of response.body.data.collections.edges) {
    if (!linksMetafieldId) {
      collection.node.metafields.edges.some((metafield) => metafield.node.key == 'links' ? linksMetafieldId = metafield.node.id : null)
    }

    collectionsIdsAndHandles.push({
      collectionId: collection.node.id,
      handle: collection.node.handle,
    })
  }

  //2.get all the collections from the txt file that have metafield
  const collectionsWithLinks = collections.filter((collection) => collection.metafields.some((metafield) => metafield.key == 'links'))

  const linksMetafieldsInfo = []

  //3. get the collections ids from their handle
  for (const collectionLink of collectionsWithLinks) {
    let filteredCollection = collectionsIdsAndHandles.filter((collection) => collection.handle == collectionLink.handle)
    let linksMetafield = collectionLink.metafields.filter((metafield) => metafield.key == 'links')
    const collectionsIds = []

    for (const collectionHandle of linksMetafield[0].collectionLinks) {
      try {
        const response = await client.query({
          data: {
            query: GET_COLLECTION_BY_HANDLE,
            variables: {
              handle: collectionHandle.handle
            },
          },
        });

        collectionsIds.push(response.body.data.collectionByHandle.id)

        if (response.errors) {
          console.error('GraphQL Error:', response.errors);
        } else {
          console.log(`Collection Link Handle added successfully.`);
        }
      } catch (error) {
        console.error('Error adding Link Handle', error);
      }
    }

    linksMetafieldsInfo.push({
      key: linksMetafield[0].key,
      namespace: linksMetafield[0].namespace,
      value: JSON.stringify(collectionsIds),
      ownerId: filteredCollection[0].collectionId
    })
  }

  //4. set the collection metafields link value
  for (const metafieldLink of linksMetafieldsInfo) {
    try {
      const response = await client.query({
        data: {
          query: UPDATE_COLLECTION_METAFIELD_VALUE,
          variables: {
            metafields: [{
              key: metafieldLink.key,
              namespace: metafieldLink.namespace,
              ownerId: metafieldLink.ownerId,
              value: metafieldLink.value,
              type: "list.collection_reference",
            }]
          },
        },
      });

      if (response.errors) {
        console.error('GraphQL Error:', response.errors);
      } else {
        console.log(`Collection Link Handle added successfully.`);
      }
    } catch (error) {
      console.error('Error adding Link Handle', error);
    }
  }

}

export async function writeCollectionsMetafields(session) {
  const client = new shopify.api.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: WRITE_COLLECTIONS_METAFIELD_QUERY,
    },
  });

  const allCollectionsMetafields = []

  response.body.data.metafieldDefinitions.edges.forEach((metafield) => {
    allCollectionsMetafields.push({
      name: metafield.node.name,
      namespace: metafield.node.namespace,
      key: metafield.node.key,
      description: metafield.node.description,
      type: metafield.node.type.name,
      ownerType: metafield.node.ownerType
    })
  })

  try {
    // await writeToFile(allCollectionsMetafields, "Metafield_Definitions-Collections.txt");
    return allCollectionsMetafields
    // console.log("Collections writing completed successfully.");
  } catch (error) {
    console.error("Failed to write collections:", error);
  }
}

export async function readCollectionsMetafields(session, metafields) {

  if (!Array.isArray(metafields)) {
    console.error('Metafields is not an array:', metafields);
    return;
  }

  const client = new shopify.api.clients.Graphql({ session });

  for (const metafield of metafields) {
    try {
      const response = await client.query({
        data: {
          query: READ_COlLECTIONS_METAFIELDS_MUTATION,
          variables: {
            definition: {
              name: metafield.name,
              namespace: metafield.namespace,
              key: metafield.key,
              description: metafield.description,
              type: metafield.type,
              ownerType: metafield.ownerType,
            },
          },
        },
      });
      if (response.errors) {
        console.error('GraphQL Error:', response.errors);
      } else {
        console.log(`Collection Metafield ${metafield.name} created successfully.`);
      }
    } catch (error) {
      console.error('Error creating collection metafield:', error);
    }
  }
}

//menus FUNCTIONS
export async function writeMenus(session) {
  const client = new shopify.api.clients.Graphql({ apiVersion: "2024-07", session });

  const GET_MENUS_QUERY = `
  {
  menus(first:10){
    edges{
      node{
        title
        handle
        items {
          title
          type
          url
          items {
            title
            type
            url
          }
        }
      }
    }
  }
}`

  const allMenus = []

  const response = await client.query({
    data: {
      query: GET_MENUS_QUERY,
    },
  });

  const menus = response.body.data.menus.edges

  for (const menu of menus) {
    const items = []

    for (const item of menu.node.items) {
      items.push(item)
    }

    allMenus.push({
      title: menu.node.title,
      handle: menu.node.handle,
      items: items
    })
  }

  try {
    // await writeToFile(allMenus, "Menus.txt");
    return allMenus
    // console.log("Menus writing completed successfully.");
  } catch (error) {
    console.error("Failed to write Menus:", error);
  }
}

export async function readMenus(session, menus) {
  const client = new shopify.api.clients.Graphql({ apiVersion: "2024-07", session });

  const GET_COLLECTION_BY_HANDLE = `query getCollectionIdFromHandle($handle: String!) {
    collectionByHandle(handle: $handle) {
      id
    }
  }`

  const CREATE_MENU_MUTATION = `
  mutation menuCreate($handle: String!, $items: [MenuItemCreateInput!]!, $title: String!) {
  menuCreate(handle: $handle, items: $items, title: $title) {
    menu {
      title
    }
    userErrors {
      field
      message
    }
  }
}`

  const allMenus = []

  for (const menu of menus) {
    const menuItemArray = []
    for (const menuItem of menu.items) {
      const subItemArray = []
      for (const subMenu of menuItem.items) {
        try {
          const response = await client.query({
            data: {
              query: GET_COLLECTION_BY_HANDLE,
              variables: {
                handle: decodeURIComponent(subMenu.url).split('/')[2]
              },
            },
          });
          subItemArray.push(
            {
              title: subMenu.title,
              type: subMenu.type,
              resourceId: response.body.data.collectionByHandle.id
            }
          )
          console.log(`sub collection id ${response.body.data.collectionByHandle.id} retrieved successfully`);
        } catch (error) {
          console.log("failed pushing product id", error);
        }
      }
      if (decodeURIComponent(menuItem.url).split('/')[2]) {
        try {
          const response = await client.query({
            data: {
              query: GET_COLLECTION_BY_HANDLE,
              variables: {
                handle: decodeURIComponent(menuItem.url).split('/')[2]
              },
            },
          });
          menuItemArray.push({
            items: subItemArray,
            resourceId: response.body.data.collectionByHandle.id,
            // tags: [],
            title: menuItem.title,
            type: menuItem.type
          })
          console.log(`father collection id ${response.body.data.collectionByHandle.id} retrieved successfully`);
        } catch (error) {
          console.log("failed pushing product id", error);
        }
      }
    }
    allMenus.push({
      handle: menu.handle,
      items: menuItemArray,
      title: menu.title
    })
  }

  let test = allMenus[0]

  try {
    const response = await client.query({
      data: {
        query: CREATE_MENU_MUTATION,
        variables:
          test
      },
    });

    if (response.errors) {
      console.error('GraphQL Error:', response.errors);
    } else {
      console.log(`Menu created successfully.`);
    }
  } catch (error) {
    console.error('Error creating Menu: ', error);
  }
}

//pages FUNCTIONS
export async function writePages(session) {
  const client = new shopify.api.clients.Graphql({ apiVersion: "unstable", session });

  const response = await client.query({
    data: {
      query: WRITE_PAGES_QUERY,
    },
  });

  const allPages = []

  response.body.data.pages.edges.forEach((page) => {
    const pageMetafields = []
    page.node.metafields.edges.forEach((metafield) => {
      pageMetafields.push({
        namespace: metafield.node.namespace,
        key: metafield.node.key,
        value: metafield.node.value,
        type: metafield.node.type
      })
    })

    allPages.push({
      body: page.node.body,
      handle: page.node.handle,
      metafields: pageMetafields,
      visible: page.node.visible,
      visibilityDate: page.node.visibilityDate,
      templateSuffix: page.node.templateSuffix,
      title: page.node.title
    })
  })

  try {
    return allPages
  } catch (error) {
    console.error("Failed to write Pages:", error);
  }

}

export async function readPages(session,pages) {
  const client = new shopify.api.clients.Graphql({ apiVersion: "unstable", session });

  for (const page of pages) {
    try {
      const response = await client.query({
        data: {
          query: READ_PAGES_MUTATION,
          variables: {
            page
          },
        },
      });

      if(response.body.data.pageCreate.userErrors.length>0){
        console.log("Error creating Page: " + response.body.data.pageCreate.userErrors.forEach((error)=>{
          console.log(error);
        }));
      } else{
        console.log(`Page with Title: ${response.body.data.pageCreate.page.title} and Handle: ${response.body.data.pageCreate.page.title}`);
      }
    } catch (error) {
      console.log("failed pushing product id", error);
    }
  }

}


//translate FUNCTIONS
export async function langchainTranslate(session, language) {
  const client = new shopify.api.clients.Graphql({ session });

  try {
    const response = await client.query({
      data: {
        query: GET_ALL_PRODUCTS_QUERY,
      },
    });

    const products = response.body.data.products.edges;

    // const allProducts = [];

    // products.forEach((product) => {
    //     allProducts.push({
    //       title: product.node.title,
    //       id: product.node.id.split("Product/")[1],
    //       descriptionHtml: product.node.descriptionHtml,
    //       isTocGenerated: false,
    //     });
    // });


    const productsInfo = [];

    products.forEach((product) => {
      const title = product.node.title;
      const descriptionHtml = product.node.descriptionHtml;
      const metafields = [];
      product.node.metafields.edges.forEach((metafield) => {
        if (metafield.node.key == 'toc') {
          metafields.push({
            key: metafield.node.key,
            namespace: metafield.node.namespace,
            value: 'no toc',
          });
        } else {
          metafields.push({
            key: metafield.node.key,
            namespace: metafield.node.namespace,
            value: metafield.node.value,
          });
        }
      });
      const images = [];
      product.node.images.edges.forEach((image) => {
        images.push({
          originalSource: image.node.url,
          alt: image.node.altText,
          mediaContentType: "IMAGE",
        });
      });

      productsInfo.push({
        title: title,
        descriptionHtml: descriptionHtml,
        metafields: metafields,
        images: images,
      });
    });

    const res = await langchain(productsInfo, language)

    // return allProducts;
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(
        `${error.message}\n${JSON.stringify(error.response, null, 2)}`
      );
    } else {
      throw error;
    }
  }


}

//publish FUNCTION
export async function publishCollectionsAndProducts(session) {
  const client = new shopify.api.clients.Graphql({ session });

  const GET_ALL_COLLECTIONS_ID_QUERY = `{
  collections(first:250){
    edges{
      node{
        id
      }
    }
  }
}`

  const GET_ALL_PRODUCTS_ID_QUERY = `{
  products(first:250){
    edges{
      node{
        id
      }
    }
  }
}`

  const GET_STORE_ADD_QUERY = `{
  publications(first:250){
    edges{
      node{
        id
      }
    }
  }
}`
  const ADD_PUBLICATIONS_MUTATION = `mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    userErrors {
      field
      message
    }
  }
}`

  const collectionsResponse = await client.query({
    data: {
      query: GET_ALL_COLLECTIONS_ID_QUERY,
    },
  });

  const productsResponse = await client.query({
    data: {
      query: GET_ALL_PRODUCTS_ID_QUERY,
    },
  });

  const publicationsResponse = await client.query({
    data: {
      query: GET_STORE_ADD_QUERY,
    },
  });

  const collections = collectionsResponse.body.data.collections.edges
  const products = productsResponse.body.data.products.edges
  const channelId = publicationsResponse.body.data.publications.edges[0].node.id

  const collectionsAndProductsIds = []

  for (const collection of collections) {
    collectionsAndProductsIds.push(collection.node.id)
  }

  for (const product of products) {
    collectionsAndProductsIds.push(product.node.id)
  }

  for (const id of collectionsAndProductsIds) {
    try {
      const response = await client.query({
        data: {
          query: ADD_PUBLICATIONS_MUTATION,
          variables: {
            id: id,
            input: {
              publicationId: channelId
            }
          },
        },
      });
      if (response.errors) {
        console.error('GraphQL Error:', response.errors);
      } else {
        console.log(`Successfully Published Product with ID: ${id}.`);
      }
    } catch (error) {
      console.error('Error Publishing:', error);
    }
  }
}

function randomTitle() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}

// export async function productHtmlDescriptionFormatter(session) {
//   const client = new shopify.api.clients.Graphql({ session });

//   try {
//     // Fetch all products from the session
//     const products = await getAllProducts(session);

//     // GraphQL mutation to update the product's description and metafield
//     const UPDATE_PRODUCT_MUTATION = `
//       mutation UpdateProduct($id: ID!, $descriptionHtml: String!, $metafieldToc: String!) {
//         productUpdate(
//           input: {
//             id: $id,
//             descriptionHtml: $descriptionHtml,
//             metafields: [
//               {
//                 key: "toc",
//                 namespace: "custom",
//                 value: $metafieldToc,
//               }
//             ]
//           }
//         ) {
//           product {
//             id
//             descriptionHtml
//           }
//           userErrors {
//             field
//             message
//           }
//         }
//       }
//     `;

//     if (products.length > 0) {
//       const productsWithoutToc = products.filter(
//         (product) => !product.isTocGenerated
//       );
//       for (const product of productsWithoutToc) {
//         const descriptionHtml = product.descriptionHtml;
//         const toc = createToc(descriptionHtml);
//         const productDescription = createProductDescription(descriptionHtml);

//         const response = await client.query({
//           data: {
//             query: UPDATE_PRODUCT_MUTATION,
//             variables: {
//               id: `gid://shopify/Product/${product.id}`,
//               descriptionHtml: `${productDescription}`,
//               metafieldToc: toc.tocHtml,
//             },
//           },
//         });

//         // Check for user errors in the response
//         if (response.body.data.productUpdate.userErrors.length > 0) {
//           throw new Error(
//             `Failed to update product ${product.id
//             }: ${response.body.data.productUpdate.userErrors
//               .map((error) => error.message)
//               .join(", ")}`
//           );
//         }
//       }
//     }
//   } catch (error) {
//     if (error instanceof GraphqlQueryError) {
//       throw new Error(
//         `${error.message}\n${JSON.stringify(error.response, null, 2)}`
//       );
//     } else {
//       throw error;
//     }
//   }
// }

// export async function generateTocForSingleProduct(
//   session,
//   gid,
//   productDescription
// ) {
//   const client = new shopify.api.clients.Graphql({ session });

//   const toc = createToc(productDescription);
//   const generateProductDescription =
//     createProductDescription(productDescription);
//   try {
//     const response = await client.query({
//       data: {
//         query: GENERATE_TOC_FOR_PRODUCT_MUTATION,
//         variables: {
//           id: `gid://shopify/Product/${gid}`,
//           descriptionHtml: `${generateProductDescription}`,
//           metafieldToc: `${toc.tocHtml}`,
//         },
//       },
//     });

//     // Check for user errors in the response
//     if (response.body.data.productUpdate.userErrors.length > 0) {
//       throw new Error(
//         `Failed to update product ${product.id
//         }: ${response.body.data.productUpdate.userErrors
//           .map((error) => error.message)
//           .join(", ")}`
//       );
//     }
//   } catch (error) {
//     if (error instanceof GraphqlQueryError) {
//       throw new Error(
//         `${error.message}\n${JSON.stringify(error.response, null, 2)}`
//       );
//     } else {
//       throw error;
//     }
//   }
// }

// export async function downloadImagesUrls(session) {
//   const client = new shopify.api.clients.Graphql({ session });

//   const response = await client.query({
//     data: {
//       query: GET_ALL_CONTENT_FILES_QUERY,
//     },
//   });

//   const imagesUrls = [];

//   const files = response.body.data.files.edges;
//   files.forEach((file) => {
//     if (file.node.image.url) {
//       let altText = file.node.alt;
//       let imageUrl = file.node.image.url;

//       imagesUrls.push({
//         alt: altText,
//         contentType: "IMAGE",
//         originalSource: imageUrl,
//       });
//     }
//   });

//   try {
//     await writeToFile(imagesUrls, "/home/dimitar/kur.txt");
//     console.log("File writing completed successfully.");
//   } catch (error) {
//     console.error("Failed to write file:", error);
//   }
// }

// export async function importImages(session) {
//   const client = new shopify.api.clients.Graphql({ session });

//   const imageUrls = await readFromFile("/home/dimitar/kur.txt");

//   try {
//     await client.query({
//       data: {
//         query: CREATE_FILE_MUTATION,
//         variables: {
//           files: imageUrls,
//         },
//       },
//     });
//   } catch (error) {
//     console.log("error creating file", error);
//   }
// }