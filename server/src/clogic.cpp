#include "clogic.h"
#include <cerrno>
#include <cstring>

void CLogic::setNetPackMap()
{
    NetPackMap(_DEF_PACK_REGISTER_RQ) = &CLogic::RegisterRq;
    NetPackMap(_DEF_PACK_LOGIN_RQ) = &CLogic::LoginRq;
    NetPackMap(_DEF_PACK_UPLOAD_RQ) =&CLogic::UploadRq;
    NetPackMap(_DEF_PACK_FILEBLOCK_RQ) = &CLogic::UploadFileBlockRq;
    NetPackMap(_DEF_PACK_DOWNLOAD_RQ) = &CLogic::DownloadRq;
    NetPackMap(_DEF_PACK_LIVE_LIST_RQ) = &CLogic::LiveListRq;
    NetPackMap(_DEF_PACK_LIVE_START_RQ) = &CLogic::LiveStartRq;
    NetPackMap(_DEF_PACK_LIVE_STOP_RQ) = &CLogic::LiveStopRq;
}

#define _DEF_COUT_FUNC_ cout << "clientfd:" << clientfd << __func__ << endl;

void CLogic::RegisterRq(sock_fd clientfd, char* szbuf, int nlen)
{
    (void)nlen;

    STRU_REGISTER_RQ *rq = (STRU_REGISTER_RQ*)szbuf;
    STRU_REGISTER_RS rs;

    char sqlBuf[_DEF_SQLIEN] = "";
    sprintf(sqlBuf, "select tel from t_UserData where tel='%s';", rq->tel);

    list<string> resList;
    bool res = m_sql->SelectMysql(sqlBuf, 1, resList);
    if (!res) {
        cout << "SelectMysql error:" << sqlBuf << endl;
        return;
    }

    if (resList.size() > 0) {
        rs.result = user_is_exist;
    } else {
        sprintf(sqlBuf,
                "insert into t_UserData "
                "(name, tel, password, food, funny, ennegy, dance, music, video, outside, edu) "
                "values('%s', '%s', '%s', %d, %d, %d, %d, %d, %d, %d, %d);",
                rq->name,
                rq->tel,
                rq->password,
                rq->food,
                rq->fun,
                rq->ennegy,
                rq->dance,
                rq->song,
                rq->video,
                rq->outside,
                rq->edu);

        if (!m_sql->UpdataMysql(sqlBuf)) {
            cout << "UpdataMysql error:" << sqlBuf << endl;
            return;
        }

        sprintf(sqlBuf, "select id from t_UserData where tel='%s';", rq->tel);
        list<string> resID;
        if (m_sql->SelectMysql(sqlBuf, 1, resID) && resID.size() > 0) {
           // rs.userid = atoi(resID.front().c_str());
        }

        char path[_MAX_PATH] = "";
        sprintf(path, "%s/%s", _DEF_USER_VIDEO_ROOT, rq->tel);
        umask(0);
        mkdir(path, S_IRWXU|S_IRWXG|S_IRWXO);

        rs.result = register_success;
    }

    _DEF_COUT_FUNC_
    SendData(clientfd, (char*)&rs, sizeof(rs));
}

void CLogic::LoginRq(sock_fd clientfd, char* szbuf, int nlen)
{
    (void)nlen;

    printf("clientfd:%d LoginRq\n", clientfd);

    STRU_LOGIN_RQ *rq = (STRU_LOGIN_RQ*)szbuf;
    STRU_LOGIN_RS rs;

    char buf[_DEF_SQLIEN] = "";
    sprintf(buf, "select password,id from t_UserData where tel = '%s';", rq->tel);

    list<string> resList;
    bool res = m_sql->SelectMysql(buf, 2, resList);
    if (!res)
    {
        cout << "SelectMysql errort" << buf << endl;
    }

    if (resList.size() > 0)
    {
        if (strcmp(resList.front().c_str(), rq->password) == 0)
        {
            rs.result = login_success;
            resList.pop_front();
            rs.userid = atoi(resList.front().c_str());

            if (m_pKernel->m_mapIDToUserFD.find(rs.userid) != m_pKernel->m_mapIDToUserFD.end())
            {
                rs.result = user_online;
            }
            else
            {
                m_pKernel->m_mapIDToUserFD[rs.userid] = clientfd;
            }
        }
        else
        {
            rs.result = password_error;
        }
    }
    else
    {
        rs.result = user_not_exist;
    }

    m_pKernel->SendData(clientfd, (char*)&rs, sizeof(rs));
}

void CLogic::UploadRq(sock_fd clientfd, char *szbuf, int nlen)
{
    (void)nlen;

    printf("clientfd:%d UploadRq\n", clientfd);

    STRU_UPLOAD_RQ *rq = (STRU_UPLOAD_RQ*)szbuf;

    // 调试：打印收到的关键字段
    cout << "UploadRq: userId=" << rq->m_nUserId
         << " fileId=" << rq->m_nFileId
         << " fileSize=" << rq->m_nFileSize
         << " fileName=[" << rq->m_szFileName << "]"
         << " fileType=[" << rq->m_szFileType << "]" << endl;

    FileInfo *info = new FileInfo;
    info->m_nPos = 0;
    memcpy(info->m_Hobby, rq->m_szHobby, _DEF_HOBBY_COUNT);

    info->m_nUserId = rq->m_nUserId;
    info->m_nFileID = rq->m_nFileId;
    info->m_VideoID = 0;
    info->m_nFileSize = rq->m_nFileSize;

    // 净化文件名：替换空格、括号等特殊字符为下划线（rtmp 不支持空格和特殊字符）
    char cleanName[_MAX_PATH];
    strcpy(cleanName, rq->m_szFileName);
    for (int i = 0; cleanName[i]; ++i) {
        if (cleanName[i] == ' ' || cleanName[i] == '(' || cleanName[i] == ')')
            cleanName[i] = '_';
    }
    strcpy(info->m_szFileName, cleanName);
    strcpy(info->m_szFileType, rq->m_szFileType);

    // 根据用户 ID 查询手机号，用手机号拼接保存目录（与注册时 mkdir 用 tel 一致）
    char sqlstr[_DEF_SQLIEN] = "";
    sprintf(sqlstr, "select tel from t_UserData where id = %d;", info->m_nUserId);

    list<string> resList;
    if (!m_sql->SelectMysql(sqlstr, 1, resList))
    {
        cout << "SelectMysql error" << sqlstr << endl;
        delete info;
        return;
    }

    if (resList.size() <= 0)
    {
        cout << "UploadRq: tel not found for userId=" << info->m_nUserId << endl;
        delete info;
        return;
    }

    // m_szTel 存储手机号，作为目录名使用（与注册时 mkdir 用 tel 一致）
    strcpy(info->m_szTel, resList.front().c_str());

    // 保存文件路径用于接收后续文件块；rtmp 路径用于后面写数据库或播放地址。
    sprintf(info->m_szFilePath, "%s/%s/%s", _DEF_USER_VIDEO_ROOT,
            info->m_szTel, info->m_szFileName);
    sprintf(info->m_szRtmp, "%s/%s", info->m_szTel, info->m_szFileName);

    // 文件额外记录 gif 名称和保存路径，方便视频封面/动图信息入库。
    if (strcmp(rq->m_szFileType, "gif") != 0)
    {
        // gif 文件名也净化
        char cleanGifName[_MAX_PATH];
        strcpy(cleanGifName, rq->m_szGifName);
        for (int i = 0; cleanGifName[i]; ++i) {
            if (cleanGifName[i] == ' ' || cleanGifName[i] == '(' || cleanGifName[i] == ')')
                cleanGifName[i] = '_';
        }
        strcpy(info->m_szGifName, cleanGifName);
        sprintf(info->m_szGifPath, "%s/%s/%s", _DEF_USER_VIDEO_ROOT,
                info->m_szTel, info->m_szGifName);
    }

    info->pFile = fopen(info->m_szFilePath, "wb");
    if (!info->pFile)
    {
        cout << "fopen error:" << info->m_szFilePath
             << " errno=" << errno
             << " (" << strerror(errno) << ")"
             << " fileName=[" << info->m_szFileName << "]"
             << " tel=[" << info->m_szTel << "]" << endl;
        delete info;
        return;
    }

    // Store upload state for following file-block packets.
    m_pKernel->m_mapFileIDToFileInfo[info->m_nFileID] = info;
}

void CLogic::DownloadRq(sock_fd clientfd, char *szbuf, int nlen)
{
    (void)nlen;

    printf("clientfd:%d DownloadRq\n", clientfd);

    STRU_DOWNLOAD_RQ *rq = (STRU_DOWNLOAD_RQ*)szbuf;
    list<FileInfo*> fileList;

    // Build the recommended cover list before sending packets.
    GetFileList(fileList, rq->m_nUserId);

    while (fileList.size() > 0)
    {
        FileInfo *info = fileList.front();
        fileList.pop_front();

        info->pFile = fopen(info->m_szFilePath, "rb");
        if (!info->pFile)
        {
            cout << "DownloadRq: fopen error:" << info->m_szFilePath
                 << " errno=" << errno << " (" << strerror(errno) << ")" << endl;
            delete info;
            continue;
        }

        // Send metadata first so the client can create the local file.
        STRU_DOWNLOAD_RS rs;
        strcpy(rs.m_rtmp, info->m_szRtmp);
        rs.m_nFileId = info->m_nFileID;
        rs.m_nVideoId = info->m_VideoID;
        rs.m_nFileSize = info->m_nFileSize;
        strcpy(rs.m_szFileName, info->m_szFileName);
        SendData(clientfd, (char*)&rs, sizeof(rs));

        // Send cover bytes in blocks. The last block uses the actual length.
        while (true)
        {
            STRU_FILEBLOCK_RQ blockrq;
            int64_t res = fread(blockrq.m_szFileContent, 1, _DEF_CONTENT_SIZE, info->pFile);
            if (res <= 0)
            {
                break;
            }

            blockrq.m_nBlockLen = res;
            blockrq.m_nFileId = info->m_nFileID;
            blockrq.m_nUserId = rq->m_nUserId;
            info->m_nPos += res;

            SendData(clientfd, (char*)&blockrq, sizeof(blockrq));

            if (info->m_nPos >= info->m_nFileSize)
            {
                break;
            }
        }

        fclose(info->pFile);
        info->pFile = NULL;
        delete info;
    }
}

void CLogic::GetFileList(list<FileInfo*> &fileList, int userId)
{
    // 计算该用户尚未收到的视频.
    char sqlStr[1024] = "";
    sprintf(sqlStr,
            "select count(videoid) from t_VideoInfo "
            "where t_VideoInfo.videoid not in "
            "(select t_UserRecv.videoid from t_UserRecv where userId = %d);",
            userId);

    int nCount = 0;
    list<string> resList;
    if (!m_sql->SelectMysql(sqlStr, 1, resList))
    {
        cout << "SelectMysql error:" << sqlStr << endl;
        return;
    }

    if (resList.size() == 0)
    {
        return;
    }

    nCount = atoi(resList.front().c_str());

    // 如果所有视频都已推送，请清除此用户的历史记录并重新开始。
    if (nCount == 0)
    {
        sprintf(sqlStr, "delete from t_UserRecv where userId = %d;", userId);
        if (!m_sql->UpdataMysql(sqlStr))
        {
            cout << "UpdataMysql error:" << sqlStr << endl;
            return;
        }
    }

    // 挑选尚未推送给该用户的前10个热门视频
    resList.clear();
    sprintf(sqlStr,
            "select videoid, picName, picPath, rtmp from t_VideoInfo "
            "where t_VideoInfo.videoid not in "
            "(select t_UserRecv.videoid from t_UserRecv where userId = %d) "
            "order by hotdegree desc limit 0, 10;",
            userId);

    if (!m_sql->SelectMysql(sqlStr, 4, resList))
    {
        cout << "SelectMysql error:" << sqlStr << endl;
        return;
    }

    nCount = 1;

    int nSize=resList.size()/4;
    for( int i=0;i<nSize;++i)
    {
        FileInfo *info = new FileInfo;

        info->m_nPos = 0;
        info->m_VideoID = atoi(resList.front().c_str());
        resList.pop_front();

        strcpy(info->m_szFileName, resList.front().c_str());
        resList.pop_front();

        strcpy(info->m_szFilePath, resList.front().c_str());
        resList.pop_front();

        strcpy(info->m_szRtmp, resList.front().c_str());
        resList.pop_front();

        // This id is only used by the client for the recommended item.
        info->m_nFileID = nCount++;

        info->pFile = fopen(info->m_szFilePath, "rb");
        if (!info->pFile)
        {
            cout << "GetFileList: fopen error:" << info->m_szFilePath
                 << " errno=" << errno << " (" << strerror(errno) << ")" << endl;
            delete info;
            continue;
        }

        fseek(info->pFile, 0, SEEK_END);
        info->m_nFileSize = ftell(info->pFile);
        fclose(info->pFile);
        info->pFile = NULL;

        fileList.push_back(info);

        // 记住已推送的视频，以避免重复推荐。
        sprintf(sqlStr, "insert into t_UserRecv values(%d, %d);",
                userId, info->m_VideoID);
        if (!m_sql->UpdataMysql(sqlStr))
        {
            cout << "UpdataMysql error:" << sqlStr << endl;
            return;
        }
    }
}

void CLogic::UploadFileBlockRq(sock_fd clientfd, char *szbuf, int nlen)
{
    (void)nlen;
    (void)clientfd;

    //printf("clientfd:%d UploadFileBlockRq\n", clientfd);

    // 1. 解析请求结构体
    STRU_FILEBLOCK_RQ *rq = (STRU_FILEBLOCK_RQ*)szbuf;

    // 2. 通过 fileId 在 map 中查找对应的 FileInfo（由 UploadRq 创建）
    auto ite = m_pKernel->m_mapFileIDToFileInfo.find(rq->m_nFileId);
    if (ite == m_pKernel->m_mapFileIDToFileInfo.end())
    {
        //cout << "UploadFileBlockRq: fileId not found, fileId=" << rq->m_nFileId << endl;
        return;
    }

    FileInfo *info = ite->second;
    // 3. 将本块数据写入文件（m_nBlockLen 为实际有效字节数）
    int nWritten = fwrite(rq->m_szFileContent, 1, rq->m_nBlockLen, info->pFile);
    if (nWritten != rq->m_nBlockLen)
    {
        cout << "UploadFileBlockRq: fwrite error, expected=" << rq->m_nBlockLen
             << " written=" << nWritten << endl;
    }

    // 4. 更新已接收偏移量
    info->m_nPos += rq->m_nBlockLen;

    // 5. 判断文件是否接收完毕
    if (info->m_nPos >= info->m_nFileSize)
    {
        // 5a. 关闭文件句柄
        fclose(info->pFile);
        info->pFile = NULL;

        // 准备上传回复包
        STRU_UPLOAD_RS rs;

        // 5b. 将视频信息写入数据库 t_VideoInfo 表
        char sqlBuf[_DEF_SQLIEN] = "";

        // 非 gif 文件才写入视频表（gif 是封面图，不入库）
        if (strcmp(info->m_szFileType, "gif") != 0)
        {
            // 插入视频记录：userId, videoName, picName, videoPath, picPath, rtmp, 喜好标签, hotdegree
            sprintf(sqlBuf,
                    "insert into t_VideoInfo "
                    "(userId, videoName, picName, videoPath, picPath, rtmp, "
                    "food, funny, ennegy, dance, music, video, outside, edu, hotdegree) "
                    "values(%d, '%s', '%s', '%s', '%s', '%s', "
                    "%d, %d, %d, %d, %d, %d, %d, %d, 0);",
                    info->m_nUserId,           // userId
                    info->m_szFileName,        // videoName
                    info->m_szGifName,         // picName (gif 文件名)
                    info->m_szFilePath,        // videoPath (完整存储路径)
                    info->m_szGifPath,         // picPath (gif 完整路径)
                    info->m_szRtmp,            // rtmp (播放地址)
                    info->m_Hobby[0],          // food
                    info->m_Hobby[1],          // funny
                    info->m_Hobby[2],          // ennegy
                    info->m_Hobby[3],          // dance
                    info->m_Hobby[4],          // music
                    info->m_Hobby[5],          // video
                    info->m_Hobby[6],          // outside
                    info->m_Hobby[7]);         // edu

            if (!m_sql->UpdataMysql(sqlBuf))
            {
                cout << "UploadFileBlockRq: insert DB error, sql=" << sqlBuf << endl;
                rs.m_nResult = upload_fail;
            }
            else
            {
                // 5c. 查询刚插入记录的自增 videoid
                sprintf(sqlBuf, "select videoid from t_VideoInfo where userId=%d and videoName='%s';",
                        info->m_nUserId, info->m_szFileName);
                list<string> resList;
                if (m_sql->SelectMysql(sqlBuf, 1, resList) && resList.size() > 0)
                {
                    info->m_VideoID = atoi(resList.front().c_str());
                }
                rs.m_nResult = upload_success;
                cout << "UploadFileBlockRq: file upload complete, VideoID=" << info->m_VideoID
                     << " name=" << info->m_szFileName << endl;
            }
        }
        else
        {
            // gif 封面文件不入库，磁盘写入成功即视为上传成功
            rs.m_nResult = upload_success;
            cout << "UploadFileBlockRq: gif cover upload complete, name=" << info->m_szFileName << endl;
        }

        // 5d. 回复客户端上传结果
        SendData(clientfd, (char*)&rs, sizeof(rs));

        // 5e. 从 map 中移除并释放 FileInfo
        m_pKernel->m_mapFileIDToFileInfo.erase(ite);
        delete info;
    }
}

void CLogic::LiveListRq(sock_fd clientfd, char *szbuf, int nlen)
{
    (void)nlen;
    STRU_LIVE_LIST_RQ *rq = (STRU_LIVE_LIST_RQ*)szbuf;
    cout << "clientfd:" << clientfd << " LiveListRq userId=" << rq->m_nUserId << endl;

    char sqlBuf[1024] = "";
    sprintf(sqlBuf,
            "select liveid, userId, title, coverPath, rtmp from t_LiveInfo "
            "where status = 1 order by startTime desc limit 0, 20;");

    list<string> resList;
    if (!m_sql->SelectMysql(sqlBuf, 5, resList))
    {
        cout << "LiveListRq SelectMysql error:" << sqlBuf << endl;
        STRU_LIVE_LIST_RS rs;
        rs.m_nIsLast = 1;
        SendData(clientfd, (char*)&rs, sizeof(rs));
        return;
    }

    int roomCount = resList.size() / 5;
    if (roomCount == 0)
    {
        STRU_LIVE_LIST_RS rs;
        rs.m_nIsLast = 1;
        SendData(clientfd, (char*)&rs, sizeof(rs));
        return;
    }

    for (int i = 0; i < roomCount; ++i)
    {
        STRU_LIVE_LIST_RS rs;
        rs.m_nLiveId = atoi(resList.front().c_str());
        resList.pop_front();

        rs.m_nUserId = atoi(resList.front().c_str());
        resList.pop_front();

        strcpy(rs.m_szTitle, resList.front().c_str());
        resList.pop_front();

        strcpy(rs.m_szCoverPath, resList.front().c_str());
        resList.pop_front();

        strcpy(rs.m_szRtmp, resList.front().c_str());
        resList.pop_front();

        rs.m_nIsLast = (i == roomCount - 1) ? 1 : 0;
        SendData(clientfd, (char*)&rs, sizeof(rs));
    }
}

void CLogic::LiveStartRq(sock_fd clientfd, char *szbuf, int nlen)
{
    (void)nlen;
    STRU_LIVE_START_RQ *rq = (STRU_LIVE_START_RQ*)szbuf;
    STRU_LIVE_START_RS rs;

    cout << "clientfd:" << clientfd << " LiveStartRq userId=" << rq->m_nUserId
         << " rtmp=[" << rq->m_szRtmp << "]" << endl;

    char sqlBuf[1024] = "";
    sprintf(sqlBuf,
            "update t_LiveInfo set status = 0, endTime = now() "
            "where userId = %d and status = 1;",
            rq->m_nUserId);
    m_sql->UpdataMysql(sqlBuf);

    sprintf(sqlBuf,
            "insert into t_LiveInfo(userId, title, coverPath, rtmp, status, startTime) "
            "values(%d, '%s', '%s', '%s', 1, now());",
            rq->m_nUserId,
            rq->m_szTitle,
            rq->m_szCoverPath,
            rq->m_szRtmp);

    if (m_sql->UpdataMysql(sqlBuf))
    {
        rs.m_nResult = live_success;
    }
    else
    {
        cout << "LiveStartRq UpdataMysql error:" << sqlBuf << endl;
        rs.m_nResult = live_fail;
    }

    SendData(clientfd, (char*)&rs, sizeof(rs));
}

void CLogic::LiveStopRq(sock_fd clientfd, char *szbuf, int nlen)
{
    (void)nlen;
    STRU_LIVE_STOP_RQ *rq = (STRU_LIVE_STOP_RQ*)szbuf;
    STRU_LIVE_STOP_RS rs;

    char sqlBuf[1024] = "";
    sprintf(sqlBuf,
            "update t_LiveInfo set status = 0, endTime = now() "
            "where userId = %d and rtmp = '%s' and status = 1;",
            rq->m_nUserId,
            rq->m_szRtmp);

    if (m_sql->UpdataMysql(sqlBuf))
    {
        rs.m_nResult = live_success;
    }
    else
    {
        cout << "LiveStopRq UpdataMysql error:" << sqlBuf << endl;
        rs.m_nResult = live_fail;
    }

    SendData(clientfd, (char*)&rs, sizeof(rs));
}
