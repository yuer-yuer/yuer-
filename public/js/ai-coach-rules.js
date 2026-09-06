(function () {
  const negativeWords = ['罪恶', '崩了', '失败', '吃多', '没运动', '焦虑', '难受', '放弃', '暴食'];

  function includesAny(text, words) {
    return words.some(word => String(text || '').includes(word));
  }

  function getQuickPrompts(state, history) {
    const hour = new Date().getHours();
    const hasFood = (state?.todayFood || []).length > 0;
    const hasExercise = (state?.todayExercise || []).length > 0;
    const lastUser = [...(history || [])].reverse().find(item => item.role === 'user')?.content || '';

    if (!(history || []).length) return ['帮我制定减脂计划', '今天吃什么好', '推荐一个运动', '计算我的BMI'];
    if (includesAny(lastUser, negativeWords)) return ['失败安慰', '给我打打气', '看看进步', '明天计划'];
    if (hour >= 6 && hour < 10 && !hasFood) return ['记录早餐', '推荐快手早餐', '看看今天食谱', '今日目标'];
    if (hour >= 10 && hour < 14) return ['记录午餐', '推荐减脂餐', '还剩多少热量', '今日目标'];
    if (hour >= 18 && hour < 22) return ['记录晚餐', '晚上吃什么不胖', '推荐轻食', '今日总结'];
    if (!hasExercise) return ['推荐一个运动', '7分钟快速燃脂', '今天步数多少', '我累了鼓励我'];
    if (hour >= 22) return ['今日总结', '明天吃什么', '设置明天提醒', '晚安小瘦'];
    return ['查今日热量', '看体重趋势', '推荐食谱', '随机鼓励'];
  }

  function welcome(username) {
    const name = username || '你';
    return `嗨，${name}！我是小瘦 🤖 你可以问我今日热量、运动建议、体重趋势，也可以让我给你打打气。有我在，瘦不难~`;
  }

  window.XIAOSHOU_RULES = {
    getQuickPrompts,
    welcome,
  };
})();
