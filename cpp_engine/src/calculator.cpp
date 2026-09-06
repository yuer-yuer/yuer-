#include "calculator.h"

#include <algorithm>
#include <cmath>
#include <stdexcept>

double round2(double value) {
  return std::round(value * 100.0) / 100.0;
}

double calcBmr(double weightKg, double heightCm, int age, const std::string& gender) {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw std::runtime_error("体重、身高和年龄必须大于0");
  }
  if (gender == "female") {
    return round2(10.0 * weightKg + 6.25 * heightCm - 5.0 * age - 161.0);
  }
  if (gender == "male") {
    return round2(10.0 * weightKg + 6.25 * heightCm - 5.0 * age + 5.0);
  }
  throw std::runtime_error("gender 只支持 male 或 female");
}

std::string activityLabel(int activityLevel) {
  switch (activityLevel) {
    case 1: return "久坐不动";
    case 2: return "轻度活动";
    case 3: return "中度活动";
    case 4: return "高强度";
    case 5: return "极高强度";
    default: throw std::runtime_error("activity_level 必须是 1-5");
  }
}

static double activityMultiplier(int activityLevel) {
  switch (activityLevel) {
    case 1: return 1.2;
    case 2: return 1.375;
    case 3: return 1.55;
    case 4: return 1.725;
    case 5: return 1.9;
    default: throw std::runtime_error("activity_level 必须是 1-5");
  }
}

TdeeResult calcTdee(double weightKg, double heightCm, int age, const std::string& gender, int activityLevel) {
  const double bmr = calcBmr(weightKg, heightCm, age, gender);
  return { bmr, round2(bmr * activityMultiplier(activityLevel)), activityLabel(activityLevel) };
}

BmiResult calcBmi(double weightKg, double heightCm) {
  if (weightKg <= 0 || heightCm <= 0) {
    throw std::runtime_error("体重和身高必须大于0");
  }
  const double heightM = heightCm / 100.0;
  const double bmi = round2(weightKg / (heightM * heightM));
  std::string category = "肥胖";
  if (bmi < 18.5) category = "偏瘦";
  else if (bmi < 24.0) category = "正常";
  else if (bmi < 28.0) category = "超重";
  return { bmi, category };
}

double calcMetCalories(double weightKg, double met, double durationMin) {
  if (weightKg <= 0 || met <= 0 || durationMin <= 0) {
    throw std::runtime_error("weight、met 和 duration_min 必须大于0");
  }
  return round2(met * weightKg * (durationMin / 60.0));
}

WeightPlanResult calcWeightPlan(double currentWeight, double targetWeight, double tdee) {
  if (currentWeight <= 0 || targetWeight <= 0 || tdee <= 0) {
    throw std::runtime_error("current_weight、target_weight 和 tdee 必须大于0");
  }
  if (targetWeight >= currentWeight) {
    throw std::runtime_error("target_weight 必须小于 current_weight");
  }
  const double dailyDeficit = std::min(tdee * 0.2, 500.0);
  const double weeklyLossKg = dailyDeficit * 7.0 / 7700.0;
  const double estimatedWeeks = (currentWeight - targetWeight) / weeklyLossKg;
  return {
    round2(dailyDeficit),
    round2(weeklyLossKg),
    round2(estimatedWeeks),
    round2(tdee - dailyDeficit),
  };
}

MacroResult calcMacro(double tdee, const std::string& goal) {
  if (tdee <= 0) {
    throw std::runtime_error("tdee 必须大于0");
  }
  double calories = tdee;
  if (goal == "reduce") calories = tdee * 0.8;
  else if (goal == "gain") calories = tdee * 1.1;
  else if (goal != "maintain") throw std::runtime_error("goal 只支持 reduce/maintain/gain");

  const double proteinG = calories * 0.3 / 4.0;
  const double fatG = calories * 0.25 / 9.0;
  const double carbsG = (calories - proteinG * 4.0 - fatG * 9.0) / 4.0;
  return { round2(calories), round2(proteinG), round2(fatG), round2(carbsG) };
}
