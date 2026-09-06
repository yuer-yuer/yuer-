/**
 * 工具定义 - LangGraph Tool Calling
 */

const TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "记录用户的饮食信息到数据库。从用户描述中提取食物名称、份量、热量等信息并保存。",
      parameters: {
        type: "object",
        properties: {
          foods: {
            type: "array",
            description: "食物列表",
            items: {
              type: "object",
              properties: {
                food_name: {
                  type: "string",
                  description: "食物名称，例如：鸡蛋、牛奶、米饭"
                },
                amount_g: {
                  type: "number",
                  description: "食物重量（克）"
                },
                calories_per_100g: {
                  type: "number",
                  description: "每100克的热量（卡路里）"
                },
                meal_type: {
                  type: "string",
                  enum: ["breakfast", "lunch", "dinner", "snack"],
                  description: "餐次类型：breakfast(早餐)、lunch(午餐)、dinner(晚餐)、snack(零食)"
                }
              },
              required: ["food_name", "amount_g", "calories_per_100g", "meal_type"]
            }
          }
        },
        required: ["foods"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "log_exercise",
      description: "记录用户的运动信息到数据库。",
      parameters: {
        type: "object",
        properties: {
          exercise_name: {
            type: "string",
            description: "运动名称，例如：跑步、HIIT、游泳"
          },
          duration_min: {
            type: "number",
            description: "运动时长（分钟）"
          },
          calories_burned: {
            type: "number",
            description: "消耗的热量（卡路里）"
          }
        },
        required: ["exercise_name", "duration_min", "calories_burned"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "log_weight",
      description: "记录用户的体重到数据库。",
      parameters: {
        type: "object",
        properties: {
          weight: {
            type: "number",
            description: "体重（千克）"
          },
          note: {
            type: "string",
            description: "备注信息（可选）"
          }
        },
        required: ["weight"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "query_today",
      description: "查询今天的饮食和运动汇总数据，包括总摄入热量、总消耗热量、净热量等。",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },

  {
    type: "function",
    function: {
      name: "query_history",
      description: "查询历史记录，可以查询最近N天的饮食、运动或体重记录。",
      parameters: {
        type: "object",
        properties: {
          record_type: {
            type: "string",
            enum: ["food", "exercise", "weight"],
            description: "记录类型：food(饮食)、exercise(运动)、weight(体重)"
          },
          days: {
            type: "number",
            description: "查询最近N天的数据，默认7天"
          }
        },
        required: ["record_type"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "search_food_database",
      description: "在食物数据库中搜索食物的热量信息。优先查询用户自定义的食物库(custom_foods)。",
      parameters: {
        type: "object",
        properties: {
          food_name: {
            type: "string",
            description: "要查询的食物名称"
          }
        },
        required: ["food_name"]
      }
    }
  }
];

module.exports = { TOOLS_SCHEMA };
