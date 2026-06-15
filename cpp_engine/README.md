# C++ Calculation Engine

This module implements the core health calculations for ManManShou as a small C++17 command line program.

## Why C++

- Keeps numerical formulas in a focused, strongly typed module.
- Demonstrates CMake-based native build workflow.
- Integrates with Node.js through stdin/stdout IPC without introducing a service dependency.

## Build

```bash
cmake -S cpp_engine -B cpp_engine/build
cmake --build cpp_engine/build --config Release
```

On this Windows workspace, `g++` can also compile it directly:

```bash
g++ -std=c++17 -O2 cpp_engine/src/main.cpp cpp_engine/src/calculator.cpp -o cpp_engine/build/Release/calc_engine.exe
```

## Protocol

Input is a single JSON object on stdin. Output is a single JSON object on stdout.

```json
{"action":"tdee","weight":65.5,"height":175,"age":22,"gender":"male","activity_level":2}
```

```json
{"success":true,"action":"tdee","result":{"bmr":1721.25,"tdee":2366.72,"activity_label":"轻度活动"}}
```

Errors are returned as JSON and the process exits with code 0:

```json
{"success":false,"error":"缺少必要字段: weight"}
```

## Actions

- `bmr`: Mifflin-St Jeor basal metabolic rate.
- `tdee`: BMR multiplied by activity level.
- `bmi`: BMI and Chinese-standard category.
- `met_calories`: exercise calories from MET, weight, and duration.
- `weight_plan`: conservative fat-loss deficit capped at 500 kcal/day.
- `macro`: macro nutrient calorie split for reduce, maintain, or gain.
