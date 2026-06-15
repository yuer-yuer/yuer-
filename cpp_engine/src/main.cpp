#include "calculator.h"

#include <iostream>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>

static std::string readAllStdin() {
  std::ostringstream buffer;
  buffer << std::cin.rdbuf();
  return buffer.str();
}

static std::string jsonEscape(const std::string& value) {
  std::string out;
  for (char ch : value) {
    if (ch == '"' || ch == '\\') out.push_back('\\');
    out.push_back(ch);
  }
  return out;
}

static bool hasField(const std::string& json, const std::string& key) {
  const std::regex pattern("\"" + key + "\"\\s*:");
  return std::regex_search(json, pattern);
}

static std::string getString(const std::string& json, const std::string& key) {
  const std::regex pattern("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"");
  std::smatch match;
  if (!std::regex_search(json, match, pattern)) {
    throw std::runtime_error("缺少必要字段: " + key);
  }
  return match[1].str();
}

static double getNumber(const std::string& json, const std::string& key) {
  const std::regex pattern("\"" + key + "\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)");
  std::smatch match;
  if (!std::regex_search(json, match, pattern)) {
    throw std::runtime_error("缺少必要字段: " + key);
  }
  return std::stod(match[1].str());
}

static int getInt(const std::string& json, const std::string& key) {
  return static_cast<int>(getNumber(json, key));
}

static void printError(const std::string& message) {
  std::cout << "{\"success\":false,\"error\":\"" << jsonEscape(message) << "\"}";
}

int main() {
  try {
    const std::string input = readAllStdin();
    if (input.empty()) {
      throw std::runtime_error("stdin 不能为空");
    }
    if (!hasField(input, "action")) {
      throw std::runtime_error("缺少必要字段: action");
    }

    const std::string action = getString(input, "action");
    if (action == "bmr") {
      const double bmr = calcBmr(getNumber(input, "weight"), getNumber(input, "height"), getInt(input, "age"), getString(input, "gender"));
      std::cout << "{\"success\":true,\"action\":\"bmr\",\"result\":{\"bmr\":" << bmr << "}}";
    } else if (action == "tdee") {
      const TdeeResult result = calcTdee(getNumber(input, "weight"), getNumber(input, "height"), getInt(input, "age"), getString(input, "gender"), getInt(input, "activity_level"));
      std::cout << "{\"success\":true,\"action\":\"tdee\",\"result\":{\"bmr\":" << result.bmr
                << ",\"tdee\":" << result.tdee
                << ",\"activity_label\":\"" << jsonEscape(result.activityLabel) << "\"}}";
    } else if (action == "bmi") {
      const BmiResult result = calcBmi(getNumber(input, "weight"), getNumber(input, "height"));
      std::cout << "{\"success\":true,\"action\":\"bmi\",\"result\":{\"bmi\":" << result.bmi
                << ",\"category\":\"" << jsonEscape(result.category) << "\"}}";
    } else if (action == "met_calories") {
      const double calories = calcMetCalories(getNumber(input, "weight"), getNumber(input, "met"), getNumber(input, "duration_min"));
      std::cout << "{\"success\":true,\"action\":\"met_calories\",\"result\":{\"calories\":" << calories << "}}";
    } else if (action == "weight_plan") {
      const WeightPlanResult result = calcWeightPlan(getNumber(input, "current_weight"), getNumber(input, "target_weight"), getNumber(input, "tdee"));
      std::cout << "{\"success\":true,\"action\":\"weight_plan\",\"result\":{\"daily_deficit\":" << result.dailyDeficit
                << ",\"weekly_loss_kg\":" << result.weeklyLossKg
                << ",\"estimated_weeks\":" << result.estimatedWeeks
                << ",\"daily_intake\":" << result.dailyIntake << "}}";
    } else if (action == "macro") {
      const MacroResult result = calcMacro(getNumber(input, "tdee"), getString(input, "goal"));
      std::cout << "{\"success\":true,\"action\":\"macro\",\"result\":{\"calories\":" << result.calories
                << ",\"protein_g\":" << result.proteinG
                << ",\"fat_g\":" << result.fatG
                << ",\"carbs_g\":" << result.carbsG << "}}";
    } else {
      throw std::runtime_error("未知 action: " + action);
    }
    return 0;
  } catch (const std::exception& ex) {
    printError(ex.what());
    return 0;
  }
}
