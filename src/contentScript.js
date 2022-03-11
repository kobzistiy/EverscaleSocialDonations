'use strict';

import { TonClient } from "@tonclient/core";
import { libWeb } from "@tonclient/lib-web";

// Application initialization

// TonClient.useBinaryLibrary(libWeb);
// const client = new TONClient();
// client.config.setData({
  // servers: ['https://net.ton.dev']
// });
// await client.setup();


async function decodeMessageBody(wallet, someMessageBody) {
  const decoded = (await wallet.client.abi.decode_message_body({
    abi: wallet.abi,
    body: someMessageBody,
    is_internal: false,
  })).value;
}


// Log `title` of current active web page
const pageTitle = document.head.getElementsByTagName('title')[0].innerHTML;
console.log(
  `Page title is: '${pageTitle}' - evaluated by Chrome extension's 'contentScript.js' file`
);

// Communicate with background file by sending a message
chrome.runtime.sendMessage(
  {
    type: 'GREETINGS',
    payload: {
      message: 'Hello, my name is Con. I am from ContentScript.',
    },
  },
  response => {
    console.log(response.message);
  }
);

// Listen for message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'COUNT') {
    console.log(`Current count is ${request.payload.count}`);
  }

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  sendResponse({});
  return true;
});

//chrome.webNavigation.onDOMContentLoaded.addListener(findDonateTemplate);
if (document.readyState === 'complete') {
  findDonateComment();
} else {
  window.addEventListener('load', findDonateComment);
}

async function graphqlReq(textgrqph) {
  console.log('textgrqph', textgrqph);
  const response = await fetch("https://gra02.main.everos.dev/graphql", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(textgrqph)
  });
  let resql = await response.json();
  console.log('resql', resql);
  return resql;
}

async function getDonatesSum(addr) {
  let textgrqph = 
{
  "query": `query {
    aggregateMessages(
      filter:{
        dst : {
          eq: "${addr}"
        }
      },
      fields:[
        { field: "value", fn:SUM }
      ]
    )
  }`,
  "variables": {}
}
  return await graphqlReq(textgrqph);
}

async function getDonatesAll(addr) {
  let resArr = [];
  let datetime = Date.now();
  console.log('datetime', datetime);
  while (true) {
    let textgrqph = 
{
  "query": "query messages($p1: MessageFilter,$p2: [QueryOrderBy]) { messages(filter: $p1,orderBy: $p2) { id, body, body_hash, created_at, value(format: DEC)}}",
  "variables": {
      "p1": {
          "dst": {
              "eq": addr
          },
          "created_at": {
              "lt": datetime
          }
      },
      "p2": [
          {
              "path": "created_at",
              "direction": "DESC"
          }
      ]
  }
}
    let res = await graphqlReq(textgrqph);
    resArr = resArr.concat(res.data.messages);
    if (res.data.messages.length < 50) break;
    datetime = res.data.messages[res.data.messages.length-1].created_at;
  } 
  resArr = resArr.filter(el => el.body !== null && el.value !== null);
  var result = [];
  resArr.reduce(function(_res, value) {
    if (!_res[value.body_hash]) {
      _res[value.body_hash] = { body: value.body, value: 0 };
      result.push(_res[value.body_hash])
    }
    _res[value.body_hash].value += 1*value.value;
    return _res;
  }, {});
  console.log('result', result);
  return result;
}

async function templateText(addr) {
  let resql = await getDonatesSum(addr);
  let sumDonate = resql.data.aggregateMessages[0];
  console.log('sumDonate', sumDonate);
  sumDonate = Math.round(sumDonate/1000000000*1000)/1000;
  let resql2 = await getDonatesAll(addr);
  console.log('resql2', resql2);
  let url = 'video';
  let regexp = /v=(.{11})/i;
  console.log('location', window.location);
  let res = window.location.href.match(regexp);
  if (res && res.length > 1) {
    console.log(res);
    url = `video:${res[1]}`;
  }
  let newtext = 
`
<p style="
  display: flex;
  justify-content: space-around;
  color: mediumslateblue;
  font-size: large;
">All donations on this addr: ${sumDonate || 0} Ē</p>
<form action="https://uri.ever.surf/transfer/${addr}" target="_blank" style="
  display: flex;
  justify-content: space-around;
  align-content: space-around;
"> 
<input type="hidden" name="amount" value="1000000000">
<input type="hidden" name="text" value="${url}"> 
<button style="
  background-color: powderblue;
  width: 100%;
  font-size: large;
">Donate 1 Ē</button>
</form>`
  return newtext;
}

async function findDonateComment() {
  console.log('findDonateComment');
  const collection = document.getElementsByClassName("content style-scope ytd-video-secondary-info-renderer");
  if (collection.length) {
    let el = collection[0];
    console.log(el.innerHTML);
    let regexp = /<a.*?uri\.ever\.surf.+?(0)%3A([0-9a-z]{64}).+?<\/a>/i;
    let res = el.innerHTML.match(regexp);
    if (res && res.length > 2) {
      console.log(res);
      let addr = `${res[1]}:${res[2]}`;
      let newtext = await templateText(addr);
      el.innerHTML = el.innerHTML.replace(res[0], newtext);
    }
  } else {
    console.log('Not found');
    window.setTimeout(findDonateComment, 1000);
  }
  
}

