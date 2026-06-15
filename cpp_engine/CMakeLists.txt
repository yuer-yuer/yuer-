cmake_minimum_required(VERSION 3.16)
project(calc_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

include_directories(src)

add_executable(calc_engine
  src/main.cpp
  src/calculator.cpp
)
