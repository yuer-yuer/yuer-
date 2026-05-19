const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'public', 'js', 'food-db.js');
const outDir = path.join(root, 'public', 'images', 'foods');
const mapPath = path.join(root, 'public', 'js', 'food-images.js');
const attributionPath = path.join(root, 'public', 'images', 'foods', 'food-image-attributions.json');
const provider = process.env.FOOD_IMAGE_PROVIDER || 'commons';

const QUERY_OVERRIDES = {
  '白米饭': 'cooked white rice bowl food',
  '糙米饭': 'cooked brown rice food',
  '馒头': 'mantou steamed bun',
  '花卷': 'huajuan steamed bun',
  '面条(煮)': 'boiled noodles bowl',
  '挂面(煮)': 'Chinese noodles bowl',
  '炒面': 'chow mein noodles',
  '饺子': 'Chinese dumplings food',
  '包子': 'baozi steamed bun',
  '烧饼': 'shaobing flatbread',
  '油条': 'youtiao Chinese fried dough',
  '粥(白粥)': 'rice porridge congee',
  '小米粥': 'millet porridge',
  '红薯': 'sweet potato food',
  '紫薯': 'purple sweet potato',
  '玉米': 'corn cob food',
  '土豆': 'potato food',
  '燕麦片': 'oatmeal bowl',
  '全麦面包': 'whole wheat bread',
  '白面包': 'white bread slices',
  '年糕': 'rice cake food',
  '煎饼': 'Chinese jianbing pancake',
  '凉皮': 'liangpi noodles',
  '米线': 'rice noodles bowl',
  '鸡胸肉': 'chicken breast cooked',
  '鸡腿肉': 'chicken thigh cooked',
  '鸡翅': 'chicken wings food',
  '猪瘦肉': 'lean pork meat',
  '猪五花肉': 'pork belly food',
  '猪排骨': 'pork ribs food',
  '牛肉(瘦)': 'lean beef food',
  '牛腩': 'beef brisket food',
  '羊肉': 'lamb meat food',
  '鱼肉(草鱼)': 'cooked fish fillet',
  '鱼肉(鲈鱼)': 'cooked fish fillet',
  '三文鱼': 'salmon fillet food',
  '虾仁': 'shrimp food',
  '大虾': 'prawns food',
  '鸡蛋(煮)': 'boiled egg',
  '鸡蛋(煎)': 'fried egg',
  '鸭蛋': 'duck egg',
  '鸭肉': 'duck meat food',
  '鸡腿(烤)': 'roast chicken leg',
  '肉丸': 'meatballs food',
  '西兰花': 'broccoli food',
  '菠菜': 'spinach food',
  '生菜': 'lettuce food',
  '白菜': 'Chinese cabbage',
  '黄瓜': 'cucumber food',
  '番茄': 'tomato food',
  '胡萝卜': 'carrot food',
  '青椒': 'green bell pepper',
  '茄子': 'eggplant food',
  '豆角': 'green beans food',
  '芹菜': 'celery food',
  '韭菜': 'garlic chives',
  '冬瓜': 'winter melon food',
  '南瓜': 'pumpkin food',
  '莲藕': 'lotus root food',
  '蘑菇': 'mushroom food',
  '木耳': 'wood ear mushroom food',
  '海带': 'kombu kelp food',
  '豆腐': 'tofu food',
  '豆芽': 'bean sprouts food',
  '苹果': 'apple fruit',
  '香蕉': 'banana fruit',
  '橙子': 'orange fruit',
  '葡萄': 'grapes fruit',
  '西瓜': 'watermelon fruit',
  '草莓': 'strawberry fruit',
  '桃子': 'peach fruit',
  '梨': 'pear fruit',
  '猕猴桃': 'kiwifruit',
  '芒果': 'mango fruit',
  '菠萝': 'pineapple fruit',
  '樱桃': 'cherries fruit',
  '荔枝': 'lychee fruit',
  '龙眼': 'longan fruit',
  '柚子': 'pomelo fruit',
  '火龙果': 'dragon fruit',
  '牛油果': 'avocado fruit',
  '豆浆(无糖)': 'soy milk',
  '纯牛奶': 'milk glass',
  '脱脂牛奶': 'skimmed milk glass',
  '酸奶(原味)': 'plain yogurt',
  '可乐': 'cola drink glass',
  '雪碧': 'lemon lime soda glass',
  '橙汁': 'orange juice glass',
  '柠檬水': 'lemon water glass',
  '绿茶': 'green tea cup',
  '咖啡(黑)': 'black coffee cup',
  '可可粉': 'cocoa powder',
  '花生': 'peanuts food',
  '核桃': 'walnuts food',
  '杏仁': 'almonds food',
  '腰果': 'cashews food',
  '开心果': 'pistachios food',
  '瓜子': 'sunflower seeds food',
  '薯片': 'potato chips',
  '饼干': 'biscuits food',
  '蛋糕': 'cake slice',
  '巧克力': 'chocolate bar',
  '冰淇淋': 'ice cream',
  '奶茶': 'milk tea',
  '沙拉': 'salad bowl',
  '番茄炒蛋': 'tomato scrambled eggs',
  '鸡蛋炒饭': 'egg fried rice',
  '红烧肉': 'hong shao rou pork belly',
  '宫保鸡丁': 'kung pao chicken',
  '鱼香肉丝': 'yuxiang shredded pork',
  '麻婆豆腐': 'mapo tofu',
  '清炒时蔬': 'stir fried vegetables',
  '炸鸡': 'fried chicken',
};

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    || Buffer.from(value).toString('hex').slice(0, 16);
}

function extractFoods() {
  const text = fs.readFileSync(dbPath, 'utf8');
  return [...text.matchAll(/name:\s*'([^']+)'\s*,\s*cal:\s*(\d+(?:\.\d+)?)\s*,\s*category:\s*'([^']+)'/g)]
    .map(match => ({ name: match[1], category: match[3] }));
}

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '640',
    format: 'json',
    origin: '*',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'SlowSlimFoodImageDownloader/1.0' },
  });
  if (!response.ok) throw new Error(`Commons search failed: ${response.status}`);
  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .map(page => ({ ...page, info: page.imageinfo?.[0] }))
    .filter(page => page.info?.thumburl && /^image\/(jpeg|png|webp)$/.test(page.info.mime || ''))
    .filter(page => !/\bmap|logo|diagram|chart|icon|svg\b/i.test(page.title || ''));
}

async function download(url, target) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SlowSlimFoodImageDownloader/1.0' },
  });
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(target, buffer);
}

async function downloadLoremFlickr(query, target) {
  const tags = query
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(',');
  const url = `https://loremflickr.com/640/480/${encodeURIComponent(tags || 'food')}`;
  await download(url, target);
  return url;
}

function imageExtension(mime, url) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (/\.png($|\?)/i.test(url)) return 'png';
  if (/\.webp($|\?)/i.test(url)) return 'webp';
  return 'jpg';
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const foods = extractFoods();
  const existing = fs.existsSync(mapPath) ? fs.readFileSync(mapPath, 'utf8') : '';
  const map = {};
  const attributions = [];

  for (const food of foods) {
    if (existing.includes(`'${food.name}'`) || existing.includes(`"${food.name}"`)) {
      continue;
    }
    const query = QUERY_OVERRIDES[food.name] || `${food.name} food`;
    try {
      if (provider === 'loremflickr') {
        const filename = `${slugify(food.name)}.jpg`;
        const target = path.join(outDir, filename);
        const source = await downloadLoremFlickr(query, target);
        map[food.name] = `/images/foods/${filename}`;
        attributions.push({
          food: food.name,
          query,
          source,
          license: 'Flickr Creative Commons pool via LoremFlickr',
        });
        console.log(`OK ${food.name} -> ${filename}`);
        await new Promise(resolve => setTimeout(resolve, 150));
        continue;
      }
      const results = await searchCommons(query);
      const best = results[0];
      if (!best) {
        console.log(`MISS ${food.name} :: ${query}`);
        continue;
      }
      const ext = imageExtension(best.info.mime, best.info.thumburl);
      const filename = `${slugify(food.name)}.${ext}`;
      const target = path.join(outDir, filename);
      await download(best.info.thumburl, target);
      map[food.name] = `/images/foods/${filename}`;
      const meta = best.info.extmetadata || {};
      attributions.push({
        food: food.name,
        query,
        title: best.title,
        source: best.info.descriptionurl,
        author: meta.Artist?.value?.replace(/<[^>]+>/g, '').trim() || '',
        license: meta.LicenseShortName?.value || meta.License?.value || '',
      });
      console.log(`OK ${food.name} -> ${filename}`);
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.log(`FAIL ${food.name} :: ${error.message}`);
    }
  }

  const merged = map;
  const output = `window.FOOD_PHOTO_MAP = ${JSON.stringify(merged, null, 2)};\n`;
  fs.writeFileSync(mapPath, output, 'utf8');
  fs.writeFileSync(attributionPath, JSON.stringify(attributions, null, 2), 'utf8');
  console.log(`Downloaded ${Object.keys(merged).length}/${foods.length} images`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
