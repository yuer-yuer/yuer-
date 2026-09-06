/**
 * 食物热量数据库
 * 单位: kcal / 100g
 * 数据来源: 中国食物成分表
 */
const FOOD_DATABASE = [
  // ──── 主食 ────
  { name: '白米饭', cal: 116, category: '主食' },
  { name: '糙米饭', cal: 111, category: '主食' },
  { name: '馒头', cal: 223, category: '主食' },
  { name: '花卷', cal: 217, category: '主食' },
  { name: '面条(煮)', cal: 110, category: '主食' },
  { name: '挂面(煮)', cal: 107, category: '主食' },
  { name: '炒面', cal: 165, category: '主食' },
  { name: '饺子', cal: 196, category: '主食' },
  { name: '包子', cal: 227, category: '主食' },
  { name: '烧饼', cal: 326, category: '主食' },
  { name: '油条', cal: 386, category: '主食' },
  { name: '粥(白粥)', cal: 46, category: '主食' },
  { name: '小米粥', cal: 46, category: '主食' },
  { name: '红薯', cal: 86, category: '主食' },
  { name: '紫薯', cal: 82, category: '主食' },
  { name: '玉米', cal: 112, category: '主食' },
  { name: '土豆', cal: 76, category: '主食' },
  { name: '燕麦片', cal: 377, category: '主食' },
  { name: '全麦面包', cal: 246, category: '主食' },
  { name: '白面包', cal: 313, category: '主食' },
  { name: '年糕', cal: 154, category: '主食' },
  { name: '煎饼', cal: 235, category: '主食' },
  { name: '凉皮', cal: 117, category: '主食' },
  { name: '米线', cal: 92, category: '主食' },

  // ──── 肉蛋类 ────
  { name: '鸡胸肉', cal: 133, category: '肉蛋类' },
  { name: '鸡腿肉', cal: 181, category: '肉蛋类' },
  { name: '鸡翅', cal: 194, category: '肉蛋类' },
  { name: '猪瘦肉', cal: 143, category: '肉蛋类' },
  { name: '猪五花肉', cal: 349, category: '肉蛋类' },
  { name: '猪排骨', cal: 264, category: '肉蛋类' },
  { name: '牛肉(瘦)', cal: 106, category: '肉蛋类' },
  { name: '牛腩', cal: 332, category: '肉蛋类' },
  { name: '羊肉', cal: 203, category: '肉蛋类' },
  { name: '鱼肉(草鱼)', cal: 113, category: '肉蛋类' },
  { name: '鱼肉(鲈鱼)', cal: 105, category: '肉蛋类' },
  { name: '三文鱼', cal: 139, category: '肉蛋类' },
  { name: '虾仁', cal: 87, category: '肉蛋类' },
  { name: '大虾', cal: 93, category: '肉蛋类' },
  { name: '鸡蛋(煮)', cal: 144, category: '肉蛋类' },
  { name: '鸡蛋(煎)', cal: 199, category: '肉蛋类' },
  { name: '鸭蛋', cal: 180, category: '肉蛋类' },
  { name: '鸭肉', cal: 240, category: '肉蛋类' },
  { name: '鸡腿(烤)', cal: 212, category: '肉蛋类' },
  { name: '肉丸', cal: 178, category: '肉蛋类' },

  // ──── 蔬菜类 ────
  { name: '西兰花', cal: 36, category: '蔬菜类' },
  { name: '菠菜', cal: 28, category: '蔬菜类' },
  { name: '生菜', cal: 15, category: '蔬菜类' },
  { name: '白菜', cal: 20, category: '蔬菜类' },
  { name: '黄瓜', cal: 16, category: '蔬菜类' },
  { name: '番茄', cal: 19, category: '蔬菜类' },
  { name: '胡萝卜', cal: 37, category: '蔬菜类' },
  { name: '青椒', cal: 23, category: '蔬菜类' },
  { name: '茄子', cal: 23, category: '蔬菜类' },
  { name: '豆角', cal: 34, category: '蔬菜类' },
  { name: '芹菜', cal: 20, category: '蔬菜类' },
  { name: '韭菜', cal: 26, category: '蔬菜类' },
  { name: '冬瓜', cal: 12, category: '蔬菜类' },
  { name: '南瓜', cal: 23, category: '蔬菜类' },
  { name: '莲藕', cal: 73, category: '蔬菜类' },
  { name: '蘑菇', cal: 27, category: '蔬菜类' },
  { name: '木耳', cal: 27, category: '蔬菜类' },
  { name: '海带', cal: 16, category: '蔬菜类' },
  { name: '豆腐', cal: 82, category: '蔬菜类' },
  { name: '豆芽', cal: 18, category: '蔬菜类' },

  // ──── 水果类 ────
  { name: '苹果', cal: 53, category: '水果类' },
  { name: '香蕉', cal: 93, category: '水果类' },
  { name: '橙子', cal: 48, category: '水果类' },
  { name: '葡萄', cal: 45, category: '水果类' },
  { name: '西瓜', cal: 31, category: '水果类' },
  { name: '草莓', cal: 32, category: '水果类' },
  { name: '桃子', cal: 48, category: '水果类' },
  { name: '梨', cal: 44, category: '水果类' },
  { name: '猕猴桃', cal: 56, category: '水果类' },
  { name: '芒果', cal: 35, category: '水果类' },
  { name: '菠萝', cal: 44, category: '水果类' },
  { name: '樱桃', cal: 46, category: '水果类' },
  { name: '荔枝', cal: 71, category: '水果类' },
  { name: '龙眼', cal: 71, category: '水果类' },
  { name: '柚子', cal: 42, category: '水果类' },
  { name: '火龙果', cal: 51, category: '水果类' },
  { name: '蓝莓', cal: 57, category: '水果类' },
  { name: '哈密瓜', cal: 34, category: '水果类' },
  { name: '牛油果', cal: 171, category: '水果类' },
  { name: '榴莲', cal: 147, category: '水果类' },

  // ──── 豆制品 ────
  { name: '豆浆(无糖)', cal: 31, category: '豆制品' },
  { name: '豆腐脑', cal: 15, category: '豆制品' },
  { name: '豆腐干', cal: 140, category: '豆制品' },
  { name: '腐竹', cal: 461, category: '豆制品' },
  { name: '千张', cal: 260, category: '豆制品' },
  { name: '豆皮', cal: 409, category: '豆制品' },

  // ──── 坚果 ────
  { name: '核桃', cal: 646, category: '坚果' },
  { name: '杏仁', cal: 578, category: '坚果' },
  { name: '花生', cal: 563, category: '坚果' },
  { name: '腰果', cal: 559, category: '坚果' },
  { name: '开心果', cal: 614, category: '坚果' },
  { name: '瓜子', cal: 606, category: '坚果' },

  // ──── 饮品 ────
  { name: '纯牛奶', cal: 54, category: '饮品' },
  { name: '脱脂牛奶', cal: 35, category: '饮品' },
  { name: '酸奶(原味)', cal: 72, category: '饮品' },
  { name: '酸奶(果味)', cal: 88, category: '饮品' },
  { name: '可乐', cal: 43, category: '饮品' },
  { name: '雪碧', cal: 42, category: '饮品' },
  { name: '奶茶', cal: 52, category: '饮品' },
  { name: '拿铁咖啡', cal: 42, category: '饮品' },
  { name: '美式咖啡', cal: 2, category: '饮品' },
  { name: '橙汁', cal: 45, category: '饮品' },
  { name: '椰汁', cal: 51, category: '饮品' },

  // ──── 零食/其他 ────
  { name: '巧克力', cal: 544, category: '零食' },
  { name: '薯片', cal: 548, category: '零食' },
  { name: '饼干', cal: 433, category: '零食' },
  { name: '蛋糕', cal: 348, category: '零食' },
  { name: '冰淇淋', cal: 127, category: '零食' },
  { name: '糖果', cal: 393, category: '零食' },
  { name: '果冻', cal: 58, category: '零食' },
  { name: '火腿肠', cal: 212, category: '零食' },
  { name: '辣条', cal: 364, category: '零食' },
  { name: '方便面', cal: 473, category: '零食' },
  { name: '月饼', cal: 421, category: '零食' },
  { name: '粽子', cal: 195, category: '零食' },
  { name: '麻花', cal: 524, category: '零食' },
  { name: '锅巴', cal: 530, category: '零食' },

  // ──── 调味/油脂 ────
  { name: '花生油', cal: 899, category: '调味' },
  { name: '橄榄油', cal: 899, category: '调味' },
  { name: '黄油', cal: 888, category: '调味' },
  { name: '沙拉酱', cal: 724, category: '调味' },
  { name: '芝麻酱', cal: 618, category: '调味' },
  { name: '番茄酱', cal: 81, category: '调味' },

  // ──── 常见菜品 ────
  { name: '番茄炒蛋', cal: 86, category: '菜品' },
  { name: '宫保鸡丁', cal: 153, category: '菜品' },
  { name: '鱼香肉丝', cal: 147, category: '菜品' },
  { name: '红烧肉', cal: 227, category: '菜品' },
  { name: '清蒸鱼', cal: 90, category: '菜品' },
  { name: '麻婆豆腐', cal: 115, category: '菜品' },
  { name: '炒青菜', cal: 45, category: '菜品' },
  { name: '蛋炒饭', cal: 174, category: '菜品' },
  { name: '水煮牛肉', cal: 126, category: '菜品' },
  { name: '酸辣汤', cal: 44, category: '菜品' },
  { name: '皮蛋瘦肉粥', cal: 56, category: '菜品' },
  { name: '小笼包', cal: 229, category: '菜品' },
  { name: '肉夹馍', cal: 261, category: '菜品' },
  { name: '煎饼果子', cal: 235, category: '菜品' },
  { name: '炸鸡', cal: 279, category: '菜品' },
  { name: '烤鱼', cal: 133, category: '菜品' },
  { name: '涮羊肉', cal: 105, category: '菜品' },
  { name: '沙拉(蔬菜)', cal: 35, category: '菜品' },
];

/**
 * 搜索食物
 * @param {string} keyword - 搜索关键词
 * @param {Array} customFoods - 用户自定义食物列表
 * @returns {Array} 匹配的食物列表
 */
function searchFoodDB(keyword, customFoods = []) {
  if (!keyword || keyword.trim() === '') return [];

  const kw = keyword.trim().toLowerCase();
  const results = [];

  // 搜索内置库
  FOOD_DATABASE.forEach(food => {
    if (food.name.toLowerCase().includes(kw)) {
      results.push({ ...food, isCustom: false });
    }
  });

  // 搜索自定义食物
  customFoods.forEach(food => {
    if (food.food_name.toLowerCase().includes(kw)) {
      results.push({
        name: food.food_name,
        cal: food.calories_per_100g,
        category: '★ 我的食物',
        isCustom: true,
        id: food.id
      });
    }
  });

  return results;
}

/**
 * 获取所有分类
 */
function getFoodCategories() {
  const cats = new Set();
  FOOD_DATABASE.forEach(f => cats.add(f.category));
  return [...cats];
}
