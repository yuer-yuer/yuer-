#pragma once

#include <string>

struct BmrResult {
  double bmr;
};

struct TdeeResult {
  double bmr;
  double tdee;
  std::string activityLabel;
};

struct BmiResult {
  double bmi;
  std::string category;
};

struct WeightPlanResult {
  double dailyDeficit;
  double weeklyLossKg;
  double estimatedWeeks;
  double dailyIntake;
};

struct MacroResult {
  double calories;
  double proteinG;
  double fatG;
  double carbsG;
};

double round2(double value);
double calcBmr(double weightKg, double heightCm, int age, const std::string& gender);
TdeeResult calcTdee(double weightKg, double heightCm, int age, const std::string& gender, int activityLevel);
BmiResult calcBmi(double weightKg, double heightCm);
double calcMetCalories(double weightKg, double met, double durationMin);
WeightPlanResult calcWeightPlan(double currentWeight, double targetWeight, double tdee);
MacroResult calcMacro(double tdee, const std::string& goal);
std::string activityLabel(int activityLevel);
