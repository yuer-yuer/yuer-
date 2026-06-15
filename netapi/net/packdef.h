#pragma once

#include<memory.h>
#include <cstdint>
#include<QString>
#include<QFile>
#include <windows.h>

#define _DEF_BUFFER         (4096)
#define _DEF_CONTENT_SIZE	(1024)
#define _MAX_SIZE           (40)
#define _MAX_PATH           (260)
#define _DEF_HOBBY_COUNT    (32)

//自定义协议   先写协议头 再写协议结构
//登录 注册 获取好友信息 添加好友 聊天 发文件 下线请求
#define _DEF_PACK_BASE	(10000)
#define _DEF_PACK_COUNT (100)

//注册
#define _DEF_PACK_REGISTER_RQ	(_DEF_PACK_BASE + 0 )
#define _DEF_PACK_REGISTER_RS	(_DEF_PACK_BASE + 1 )
//登录
#define _DEF_PACK_LOGIN_RQ	(_DEF_PACK_BASE + 2 )
#define _DEF_PACK_LOGIN_RS	(_DEF_PACK_BASE + 3 )

#define _DEF_PACK_UPLOAD_RQ      (_DEF_PACK_BASE + 4 )
#define _DEF_PACK_UPLOAD_RS      (_DEF_PACK_BASE + 5 )
#define _DEF_PACK_FILEBLOCK_RQ   (_DEF_PACK_BASE + 6 )

#define _DEF_PACK_DOWNLOAD_RQ   (_DEF_PACK_BASE + 7 )
#define _DEF_PACK_DOWNLOAD_RS   (_DEF_PACK_BASE + 8 )
#define _DEF_PACK_LIVE_LIST_RQ  (_DEF_PACK_BASE + 9 )
#define _DEF_PACK_LIVE_LIST_RS  (_DEF_PACK_BASE + 10 )
#define _DEF_PACK_LIVE_START_RQ (_DEF_PACK_BASE + 11 )
#define _DEF_PACK_LIVE_START_RS (_DEF_PACK_BASE + 12 )
#define _DEF_PACK_LIVE_STOP_RQ  (_DEF_PACK_BASE + 13 )
#define _DEF_PACK_LIVE_STOP_RS  (_DEF_PACK_BASE + 14 )

//返回的结果
//注册请求的结果
#define user_is_exist		(0)
#define register_success	(1)
//登录请求的结果
#define user_not_exist		(0)
#define password_error		(1)
#define login_success		(2)
#define user_online         (3)

//上传请求的结果
#define upload_fail         (0)
#define upload_success      (1)

#define live_fail           (0)
#define live_success        (1)


typedef int PackType;

//协议结构
//注册
typedef struct STRU_REGISTER_RQ
{
    STRU_REGISTER_RQ():type(_DEF_PACK_REGISTER_RQ)
    {
        memset( tel  , 0, sizeof(tel));
        memset( name  , 0, sizeof(name));
        memset( password , 0, sizeof(password) );
        food     =0;
        song     =0;
        fun      =0;
        video    =0;
        ennegy   =0;
        outside  =0;
        dance    =0;
        edu      =0;
    }
    //需要手机号码 , 密码, 昵称
    PackType type;
    char tel[_MAX_SIZE];
    char name[_MAX_SIZE];
    char password[_MAX_SIZE];
    int food          ;
    int song          ;
    int fun           ;
    int video         ;
    int ennegy        ;
    int outside       ;
    int dance         ;
    int edu           ;

}STRU_REGISTER_RQ;

typedef struct STRU_REGISTER_RS
{
    //回复结果
    STRU_REGISTER_RS(): type(_DEF_PACK_REGISTER_RS) , result(register_success), userid(0)
    {
    }
    PackType type;
    int result;
    int userid;

}STRU_REGISTER_RS;

//登录
typedef struct STRU_LOGIN_RQ
{
    //登录需要: 手机号 密码
    STRU_LOGIN_RQ():type(_DEF_PACK_LOGIN_RQ)
    {
        memset( tel , 0, sizeof(tel) );
        memset( password , 0, sizeof(password) );
    }
    PackType type;
    char tel[_MAX_SIZE];
    char password[_MAX_SIZE];

}STRU_LOGIN_RQ;

typedef struct STRU_LOGIN_RS
{
    // 需要 结果 , 用户的id
    STRU_LOGIN_RS(): type(_DEF_PACK_LOGIN_RS) , result(login_success),userid(0)
    {
    }
    PackType type;
    int result;
    int userid;

}STRU_LOGIN_RS;

// 上传文件请求
typedef struct STRU_UPLOAD_RQ
{
    STRU_UPLOAD_RQ()
    {
        m_nType = _DEF_PACK_UPLOAD_RQ;
        m_nFileId = 0;
        m_nUserId = 0;
        memset(m_szFileType , 0 , _MAX_SIZE);
        memset(m_szGifName , 0 , _MAX_SIZE);
        memset(m_szFileName , 0 , _MAX_PATH);
    }

    PackType m_nType;    // 包类型
    int      m_nUserId;  // 用于查数据库，获取用户名字，拼接路径
    int      m_nFileId;  // 区分不同文件，可采用 md5 或随机数，用户同时只能传一个，所以相同概率较低
    int64_t  m_nFileSize; // 文件大小，用于文件传输结束
    char     m_szHobby[_DEF_HOBBY_COUNT]; // 喜好标签
    char     m_szFileName[_MAX_PATH];     // 文件名，用于存储文件
    char     m_szGifName[_MAX_PATH];      // 动画名字，方便直接写入数据库
    char     m_szFileType[_MAX_SIZE];     // 用于区分视频和图片
} STRU_UPLOAD_RQ;


// 上传文件请求回复
typedef struct STRU_UPLOAD_RS
{
    STRU_UPLOAD_RS()
    {
        m_nType = _DEF_PACK_UPLOAD_RS;
        m_nResult = 0;
    }

    PackType m_nType;   // 包类型
    int      m_nResult;
} STRU_UPLOAD_RS;


// 文件块请求
typedef struct STRU_FILEBLOCK_RQ
{
    STRU_FILEBLOCK_RQ()
    {
        m_nType = _DEF_PACK_FILEBLOCK_RQ;
        m_nUserId = 0;
        m_nFileId = 0;
        m_nBlockLen = 0;
        ZeroMemory(m_szFileContent, _DEF_CONTENT_SIZE);
    }

    PackType m_nType;       // 包类型
    int      m_nUserId;     // 用户 ID
    int      m_nFileId;     // 文件 id，用于区分文件
    int      m_nBlockLen;   // 文件写入大小
    char     m_szFileContent[_DEF_CONTENT_SIZE];
} STRU_FILEBLOCK_RQ;

//下载文件请求
typedef struct STRU_DOWNLOAD_RQ
{
    STRU_DOWNLOAD_RQ()
    {
        m_nType = _DEF_PACK_DOWNLOAD_RQ;
        m_nUserId = 0;
    }
    PackType      m_nType;      //包类型
    int        m_nUserId; //用户ID
}STRU_DOWNLOAD_RQ;
//下载文件回复
typedef struct STRU_DOWNLOAD_RS
{
    STRU_DOWNLOAD_RS()
    {
        m_nType = _DEF_PACK_DOWNLOAD_RS;
        m_nFileId = 0;
        memset(m_szFileName , 0 ,_MAX_PATH);
        memset(m_rtmp , 0 ,_MAX_PATH);
    }
    PackType m_nType;      //包类型
    int            m_nFileId;
    int64_t    m_nFileSize;
    int            m_nVideoId;
    char         m_szFileName[_MAX_PATH];
    char         m_rtmp[_MAX_PATH];    //  播放地址 如//1/103 .MP3        用户本地需要转化为 rtmp://服务器ip/app 名/+  这个字符串 //本项目  app 名为vod
}STRU_DOWNLOAD_RS;

typedef struct STRU_LIVE_LIST_RQ
{
    STRU_LIVE_LIST_RQ()
    {
        m_nType = _DEF_PACK_LIVE_LIST_RQ;
        m_nUserId = 0;
    }
    PackType m_nType;
    int      m_nUserId;
} STRU_LIVE_LIST_RQ;

typedef struct STRU_LIVE_LIST_RS
{
    STRU_LIVE_LIST_RS()
    {
        m_nType = _DEF_PACK_LIVE_LIST_RS;
        m_nLiveId = 0;
        m_nUserId = 0;
        m_nIsLast = 0;
        memset(m_szTitle, 0, _MAX_PATH);
        memset(m_szCoverPath, 0, _MAX_PATH);
        memset(m_szRtmp, 0, _MAX_PATH);
    }
    PackType m_nType;
    int      m_nLiveId;
    int      m_nUserId;
    int      m_nIsLast;
    char     m_szTitle[_MAX_PATH];
    char     m_szCoverPath[_MAX_PATH];
    char     m_szRtmp[_MAX_PATH];
} STRU_LIVE_LIST_RS;

typedef struct STRU_LIVE_START_RQ
{
    STRU_LIVE_START_RQ()
    {
        m_nType = _DEF_PACK_LIVE_START_RQ;
        m_nUserId = 0;
        memset(m_szTitle, 0, _MAX_PATH);
        memset(m_szCoverPath, 0, _MAX_PATH);
        memset(m_szRtmp, 0, _MAX_PATH);
    }
    PackType m_nType;
    int      m_nUserId;
    char     m_szTitle[_MAX_PATH];
    char     m_szCoverPath[_MAX_PATH];
    char     m_szRtmp[_MAX_PATH];
} STRU_LIVE_START_RQ;

typedef struct STRU_LIVE_START_RS
{
    STRU_LIVE_START_RS()
    {
        m_nType = _DEF_PACK_LIVE_START_RS;
        m_nResult = live_fail;
    }
    PackType m_nType;
    int      m_nResult;
} STRU_LIVE_START_RS;

typedef struct STRU_LIVE_STOP_RQ
{
    STRU_LIVE_STOP_RQ()
    {
        m_nType = _DEF_PACK_LIVE_STOP_RQ;
        m_nUserId = 0;
        memset(m_szRtmp, 0, _MAX_PATH);
    }
    PackType m_nType;
    int      m_nUserId;
    char     m_szRtmp[_MAX_PATH];
} STRU_LIVE_STOP_RQ;

typedef struct STRU_LIVE_STOP_RS
{
    STRU_LIVE_STOP_RS()
    {
        m_nType = _DEF_PACK_LIVE_STOP_RS;
        m_nResult = live_fail;
    }
    PackType m_nType;
    int      m_nResult;
} STRU_LIVE_STOP_RS;


// 文件信息（客户端使用）
struct FileInfo
{
    int      videoId;
    int      fileId;
    int64_t  filePos;
    int64_t  fileSize;
    QString  filePath;
    QString  fileName;
    QString  rtmpUrl;
    QFile   *pFile;
};





