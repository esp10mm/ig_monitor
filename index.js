var request = require('superagent');
var cheerio = require('cheerio');
var fs = require('fs');
var Nightmare = require('nightmare');       
var nightmare = Nightmare({ show: false, 'web-preferences': {'web-security': false}});

var config = require('./config');
var target = process.argv[2];

var target_dir = '';

if (!fs.existsSync('./data')){
  fs.mkdirSync('./data/');
}

const fetchImage = (url, localPath) => {
  request.get(url).then((response) => {
    if (response) {
      fs.writeFile(localPath, response.body);
      console.log(`File saved: ${url}`);
    }
	});
}

const monitoring = () => {
  var log = {};

  if (fs.existsSync(`${target_dir}/log.json`)) {
    log = JSON.parse(fs.readFileSync(`${target_dir}/log.json`));
  }

  nightmare
    .goto(`https://www.instagram.com/${target}/`)
    .refresh()
    .wait('body')
    .evaluate(() => {
      return document.querySelector('body').innerHTML;
    })
    .then((html) => {
      var $ = cheerio.load(html);
      var dirty = false;

      $('img').each((i, el) => {
        var url = el.attribs.src;
        var alt = el.attribs.alt;
        var urlsplit = url.split('/');
        var filename = urlsplit[urlsplit.length - 1];

        if (!fs.existsSync(`${target_dir}/${filename}`)) {
          console.log(`New article: ${alt || ''}`);
          fetchImage(url, `${target_dir}/${filename}`);
          log[filename] = alt || '';
          dirty = true;
        }
      })

      if (dirty) {
        fs.writeFile(`${target_dir}/log.json`, JSON.stringify(log));
      }

      setTimeout(monitoring, 10000);
    })
    .catch(function (error) {
      console.log(error);
    });
};

const login = () => {
  nightmare
    .goto('https://www.instagram.com/accounts/login/')
    .wait('input')
    .type('input[type="text"]', config.username)
    .type('input[type="password"]', config.password)
    .click('button')
    .then(() => { setTimeout(monitoring, 5000); })
    .catch(function (error) {
      console.log(error);
    });
};

if (!target) {
  console.log('Please enter target account!');
} else {
  target_dir = `./data/${target}`;
  if (!fs.existsSync(target_dir)){
    fs.mkdirSync(target_dir);
  }
  login();
}
// monitoring();
