/**
 * 运动 MET 数据库
 * MET (Metabolic Equivalent of Task) - 代谢当量
 * 消耗热量 = MET × 体重(kg) × 时长(小时)
 */
const EXERCISE_DATABASE = [
  { name: '慢跑(6km/h)', met: 6.0, icon: '🏃', category: '有氧' },
  { name: '快跑(10km/h)', met: 10.0, icon: '🏃‍♂️', category: '有氧' },
  { name: '快走(5km/h)', met: 3.8, icon: '🚶', category: '有氧' },
  { name: '竞走(7km/h)', met: 5.3, icon: '🚶‍♂️', category: '有氧' },
  { name: '游泳(自由泳)', met: 8.0, icon: '🏊', category: '有氧' },
  { name: '游泳(蛙泳)', met: 5.3, icon: '🏊‍♀️', category: '有氧' },
  { name: '骑自行车(中速)', met: 6.8, icon: '🚴', category: '有氧' },
  { name: '骑自行车(快速)', met: 10.0, icon: '🚴‍♂️', category: '有氧' },
  { name: '跳绳(慢速)', met: 8.8, icon: '🤸', category: '有氧' },
  { name: '跳绳(快速)', met: 12.3, icon: '🤸‍♀️', category: '有氧' },
  { name: '瑜伽', met: 3.0, icon: '🧘', category: '柔韧' },
  { name: '普拉提', met: 3.8, icon: '🧘‍♀️', category: '柔韧' },
  { name: '力量训练(轻)', met: 3.5, icon: '🏋️', category: '力量' },
  { name: '力量训练(中)', met: 5.0, icon: '🏋️‍♂️', category: '力量' },
  { name: '力量训练(重)', met: 6.0, icon: '💪', category: '力量' },
  { name: 'HIIT训练', met: 8.0, icon: '⚡', category: '高强度' },
  { name: '搏击操', met: 7.3, icon: '🥊', category: '高强度' },
  { name: '爬山', met: 6.5, icon: '⛰️', category: '户外' },
  { name: '爬楼梯', met: 8.0, icon: '🏢', category: '日常' },
  { name: '跳舞', met: 5.5, icon: '💃', category: '有氧' },
  { name: '羽毛球', met: 5.5, icon: '🏸', category: '球类' },
  { name: '乒乓球', met: 4.0, icon: '🏓', category: '球类' },
  { name: '篮球', met: 6.5, icon: '🏀', category: '球类' },
  { name: '足球', met: 7.0, icon: '⚽', category: '球类' },
  { name: '网球', met: 7.3, icon: '🎾', category: '球类' },
  { name: '太极拳', met: 3.0, icon: '🥋', category: '柔韧' },
  { name: '划船机', met: 7.0, icon: '🚣', category: '有氧' },
  { name: '椭圆机', met: 5.0, icon: '🏟️', category: '有氧' },
  { name: '家务劳动', met: 3.3, icon: '🧹', category: '日常' },
  { name: '散步', met: 2.5, icon: '🚶‍♀️', category: '日常' },
];

/**
 * 计算运动消耗热量
 * @param {number} met - MET值
 * @param {number} weightKg - 体重(kg)
 * @param {number} durationMin - 时长(分钟)
 * @returns {number} 消耗热量(kcal)
 */
function calcExerciseCal(met, weightKg, durationMin) {
  if (!met || !weightKg || !durationMin) return 0;
  return Math.round(met * weightKg * (durationMin / 60));
}

/**
 * 根据热量缺口推荐运动
 * @param {number} deficitKcal - 需要消耗的热量(kcal)
 * @param {number} weightKg - 体重(kg)
 * @returns {Array} 推荐运动列表
 */
function recommendExercise(deficitKcal, weightKg) {
  if (!deficitKcal || deficitKcal <= 0 || !weightKg) return [];

  const recommendations = [];
  // 选择常见运动推荐
  const commonExercises = EXERCISE_DATABASE.filter(e =>
    ['慢跑(6km/h)', '快走(5km/h)', '游泳(自由泳)', '骑自行车(中速)', '跳绳(慢速)', '力量训练(中)', 'HIIT训练', '爬楼梯'].includes(e.name)
  );

  commonExercises.forEach(ex => {
    const durationMin = Math.ceil((deficitKcal / (ex.met * weightKg)) * 60);
    if (durationMin > 0 && durationMin <= 180) { // 不推荐超过3小时
      recommendations.push({
        ...ex,
        durationMin,
        calories: calcExerciseCal(ex.met, weightKg, durationMin)
      });
    }
  });

  return recommendations.sort((a, b) => a.durationMin - b.durationMin);
}
