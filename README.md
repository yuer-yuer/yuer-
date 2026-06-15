# MediaPlayer

一个基于 Qt/C++ 的视频播放与分享项目，包含客户端播放器、视频录制/上传、推荐视频列表、RTMP 播放，以及配套的 Linux C++ 业务服务器。

## 功能

- 用户注册、登录
- 视频文件上传与封面上传
- 推荐视频列表加载
- RTMP/VOD 地址播放
- 本地录制视频
- 直播间列表
- 主播端开播/下播
- 使用 FFmpeg DirectShow 采集摄像头/麦克风并推流到 nginx-rtmp

## 项目结构

```text
MediaPlayer/
├── MediaPlayer.pro          # Qt 客户端工程
├── main.cpp                 # 客户端入口
├── onlinedialog.*           # 在线模块：登录、上传、推荐、直播入口
├── livedialog.*             # 直播间列表与个人开播窗口
├── videoplayer.*            # FFmpeg/SDL 播放器
├── uploaddialog.*           # 视频上传窗口
├── VideoRecoder/            # 录制相关模块
├── netapi/                  # TCP 客户端网络封装与协议
├── server/                  # Linux C++ 业务服务器
├── ffmpeg-4.2.2/            # FFmpeg 依赖
├── SDL2-2.0.10/             # SDL2 依赖
└── sql_live_module.sql      # 直播表建表 SQL
```

## 客户端环境

- Qt 5.12.x
- MinGW 32-bit 工具链
- FFmpeg 4.2.2
- SDL2
- OpenCV 4.2.0（录制模块使用）

打开方式：

```text
Qt Creator -> Open Project -> MediaPlayer.pro
```

## 服务端环境

服务端位于 `server/`，使用 Linux C++、epoll、MySQL。

默认配置见 `server/include/packdef.h`：

```cpp
#define _DEF_PORT 8000
#define _DEF_DB_NAME "VidoePlayer"
#define _DEF_DB_USER "root"
#define _DEF_DB_PWD  "1111"
```

编译服务端：

```bash
cd server/src
make
./server 8000
```

## 数据库

项目已有表包括：

- `t_UserData`
- `t_VideoInfo`
- `t_UserRecv`

直播模块需要额外执行：

```sql
source sql_live_module.sql;
```

或者手动执行：

```sql
create table if not exists t_LiveInfo (
    liveid bigint unsigned not null auto_increment,
    userId bigint unsigned default null,
    title varchar(300) default null,
    coverPath varchar(300) default null,
    rtmp varchar(300) default null,
    status int default 1,
    startTime datetime default null,
    endTime datetime default null,
    primary key (liveid),
    key idx_live_status_start (status, startTime),
    key idx_live_user_status (userId, status)
);
```

## 直播模块说明

直播模块分为两层：

- 直播间列表：显示正在直播的房间，点击房间后使用 RTMP 地址播放。
- 我要直播：设置标题、封面、摄像头、麦克风和推流地址。

开播时客户端会调用 FFmpeg，命令形式类似：

```bash
ffmpeg.exe -f dshow -i video="HD Webcam":audio="Microphone" \
  -vcodec libx264 -preset ultrafast -tune zerolatency \
  -acodec aac -f flv rtmp://192.168.75.135/videotest/user=7
```

如果不选择麦克风，则只推视频流。

关闭个人开播窗口或直播间窗口时，会自动停止本地 FFmpeg 推流进程，并通知服务端下播。

## 注意事项

- 当前客户端连接服务器地址在 `ckernel.cpp` 中硬编码为 `192.168.75.135:8000`。
- `debug/`、`release/`、Qt Creator 用户文件和自动生成文件不会提交到 Git。
- 如果封面路径包含中文，建议数据库和 MySQL 连接使用 `utf8mb4`。
