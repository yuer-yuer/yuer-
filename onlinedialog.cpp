#include "onlinedialog.h"
#include "ui_onlinedialog.h"

#include <QCryptographicHash>
#include <QDebug>
#include <QMessageBox>
#include <QFileInfo>
#include <QPushButton>
#include <QTime>
#include <QDir>
#include "ckernel.h"
#include "livedialog.h"
#include "videocoverwidget.h"

#ifndef _DEF_SERVER_IP
#define _DEF_SERVER_IP "192.168.75.135"
#endif

#define MD5_KEY 12345

static QByteArray GetMD5(QString val)
{
    QCryptographicHash hash(QCryptographicHash::Md5);
    QString tmp = QString("%1_%2").arg(val).arg(MD5_KEY);
    hash.addData(tmp.toStdString().c_str());

    QByteArray bt = hash.result();
    return bt.toHex();
}

OnlineDialog::OnlineDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::OnlineDialog),
    m_login(nullptr),
    m_uploadDlg(nullptr),
    m_liveDlg(nullptr),
    m_netOpened(false),
    m_id(0)
{
    qsrand(QTime::currentTime().msec());
    qRegisterMetaType<hobby>("hobby");
    ui->setupUi(this);

    m_login = new LoginDia();
    m_login->hide();
    m_uploadDlg = new UploadDialog();
    m_uploadDlg->hide();
    m_liveDlg = new LiveDialog();
    m_liveDlg->hide();
    connect(m_login, &LoginDia::signals_sendLoginInfo,
            this, &OnlineDialog::slot_loginCommit);
    connect(m_login, &LoginDia::signals_sendRegisterInfo,
            this, &OnlineDialog::slot_registerCommit);
    connect(m_uploadDlg, &UploadDialog::SIG_UploadFile,
            this, &OnlineDialog::slot_UploadFile);
    connect(m_liveDlg, &LiveDialog::SIG_refreshLiveList,
            this, &OnlineDialog::slot_requestLiveList);
    connect(m_liveDlg, &LiveDialog::SIG_startLive,
            this, &OnlineDialog::slot_startLive);
    connect(m_liveDlg, &LiveDialog::SIG_stopLive,
            this, &OnlineDialog::slot_stopLive);
    connect(m_liveDlg, &LiveDialog::SIG_playLive,
            this, &OnlineDialog::SIG_playRtmp);
    connect(CKernel::GetInstance(), &CKernel::SIG_ReadyData,
            this, &OnlineDialog::slot_ReadyData);
    // 进度条：上传过程中实时更新进度
    connect(this, &OnlineDialog::SIG_updateProcess,
            m_uploadDlg, &UploadDialog::slot_updateProcess);

    // 连接所有推荐视频封面的点击信号，转发为 SIG_playRtmp
    for (int i = 1; i <= 10; ++i) {
        QString name = QString("pb_play%1").arg(i);
        VideoCoverWidget *cover = this->findChild<VideoCoverWidget *>(name);
        if (cover) {
            connect(cover, &VideoCoverWidget::SIG_click,
                    this, &OnlineDialog::SIG_playRtmp);
        }
    }

    QPushButton *liveButton = new QPushButton("直播", this);
    liveButton->setObjectName("pb_live");
    liveButton->setGeometry(640, 180, 89, 31);
    connect(liveButton, &QPushButton::clicked,
            this, &OnlineDialog::slot_openLiveDialog);
}

OnlineDialog::~OnlineDialog()
{
    if (m_login) {
        delete m_login;
        m_login = nullptr;
    }
    if (m_uploadDlg) {
        delete m_uploadDlg;
        m_uploadDlg = nullptr;
    }
    if (m_liveDlg) {
        delete m_liveDlg;
        m_liveDlg = nullptr;
    }
    delete ui;
}

void OnlineDialog::showEvent(QShowEvent *event)
{
    QDialog::showEvent(event);

    if (!m_netOpened) {
        m_netOpened = CKernel::GetInstance()->openNet();
        if (!m_netOpened) {
            QMessageBox::about(this, "提示", "网络连接失败");
        }
    }
}

void OnlineDialog::on_pb_login_clicked()
{
    m_login->show();
}

void OnlineDialog::on_pb_upload_clicked()
{
    if (m_id == 0) {
        QMessageBox::about(this, "提示", "先登录");
        return;
    }
    m_uploadDlg-> clear();
    m_uploadDlg->show();
}

void OnlineDialog::slot_loginCommit(QString tel, QString password)
{
    //TODO
    m_userName=tel;
    std::string strtel = tel.toStdString();
    char* buftel = (char*)strtel.c_str();

    QByteArray bt = GetMD5(password);

    STRU_LOGIN_RQ rq;
    strcpy_s(rq.tel, _MAX_SIZE, buftel);
    memcpy(rq.password, bt.data(), bt.length());

    if (!CKernel::GetInstance()->sendData((char*)&rq, sizeof(rq))) {
        QMessageBox::about(this, "提示", "网络故障");
    }
}

void OnlineDialog::slot_registerCommit(QString name, QString tel, QString password, hobby hy)
{
    std::string strtel = tel.toStdString();
    char* buftel = (char*)strtel.c_str();
    std::string strNmae = name.toStdString();
    char* bufNmae = (char*)strNmae.c_str();

    QByteArray bt = GetMD5(password);

    STRU_REGISTER_RQ rq;
    strcpy_s(rq.tel, _MAX_SIZE, buftel);
    strcpy_s(rq.name, _MAX_SIZE, bufNmae);
    memcpy(rq.password, bt.data(), bt.length());
    rq.food = hy.food;
    rq.song = hy.song;
    rq.fun = hy.fun;
    rq.video = hy.video;
    rq.ennegy = hy.ennegy;
    rq.outside = hy.outside;
    rq.dance = hy.dance;
    rq.edu = hy.edu;

    if (!CKernel::GetInstance()->sendData((char*)&rq, sizeof(rq))) {
        QMessageBox::about(this, "提示", "网络故障");
    }
}

void OnlineDialog::slot_ReadyData(uint from, char *buf, int nlen)
{
    Q_UNUSED(from);
    PackType type = *(PackType*)buf;
    switch (type) {
    case _DEF_PACK_REGISTER_RS:
        slot_registerRs(buf,nlen);
        break;
    case _DEF_PACK_LOGIN_RS:
        slot_loginRs(buf,nlen);
        break;
    case _DEF_PACK_UPLOAD_RS:
        slot_uploadRs(buf,nlen);
        break;
    case _DEF_PACK_FILEBLOCK_RQ:
        slot_fileblockRq(buf,nlen);
        break;
    case _DEF_PACK_DOWNLOAD_RS:
        slot_downloadRs(buf,nlen);
        break;
    case _DEF_PACK_LIVE_LIST_RS:
        slot_liveListRs(buf,nlen);
        break;
    case _DEF_PACK_LIVE_START_RS:
        slot_liveStartRs(buf,nlen);
        break;
    case _DEF_PACK_LIVE_STOP_RS:
        slot_liveStopRs(buf,nlen);
        break;
    default:
        break;
    }

    delete[] buf;
}

void OnlineDialog::slot_loginRs(char *buf, int nlen)
{
    STRU_LOGIN_RS *rs = (STRU_LOGIN_RS *) buf;
    switch( rs->result )
    {
    case user_not_exist:
        QMessageBox::about( m_login , "提示" , "用户不存在, 登录失败");
        break;
    case password_error :
        QMessageBox::about( m_login , "提示" , "用户密码错误, 登录失败");
        break;
    case login_success :
    {
        QMessageBox::about( m_login , "提示" , "登录成功");
        //界面
        ui->lb_name->setText( QString("您好, %1") .arg(m_userName) );
        m_login->hide();
        m_id = rs->userid ;

        //下载
        STRU_DOWNLOAD_RQ rq;
        rq.m_nUserId=m_id;
        CKernel::GetInstance()->sendData((char*)&rq,sizeof(rq));

        break;
    }
    case user_online:
        QMessageBox::about( m_login , "提示" , "用户已在线, 登录失败");
        break;
    }

}

void OnlineDialog::slot_registerRs(char *buf, int nlen)
{
    STRU_REGISTER_RS * rs = (STRU_REGISTER_RS * ) buf;
    switch( rs->result )
    {
    case user_is_exist:
        QMessageBox::about( m_login , "提示" , "用户已存在, 注册失败");
        break;
    case register_success:
        QMessageBox::about( m_login , "提示" , "注册成功");
        break;
    }
}

void OnlineDialog::slot_uploadRs(char *buf, int nlen)
{
    (void)nlen;

    STRU_UPLOAD_RS *rs = (STRU_UPLOAD_RS *)buf;
    switch (rs->m_nResult)
    {
    case upload_success:
        QMessageBox::about(m_uploadDlg, "提示", "上传成功");
        m_uploadDlg->clear();   // 清空上传界面，准备下一次上传
        m_uploadDlg->hide();

        // 上传成功后重新请求推荐视频列表（包含刚上传的视频）
        {
            STRU_DOWNLOAD_RQ rq;
            rq.m_nUserId = m_id;
            CKernel::GetInstance()->sendData((char*)&rq, sizeof(rq));
        }
        break;
    case upload_fail:
        QMessageBox::about(m_uploadDlg, "提示", "上传失败，请重试");
        break;
    default:
        break;
    }
}

void OnlineDialog::slot_downloadRs(char *buf, int nlen)
{
    (void)nlen;

    STRU_DOWNLOAD_RS *rs = (STRU_DOWNLOAD_RS *)buf;

    // 给下载文件建立本地 FileInfo，videoId 用来标识真实视频，fileId 用来区分控件。
    FileInfo *info = new FileInfo;
    info->videoId = rs->m_nVideoId;
    info->fileId = rs->m_nFileId;
    info->fileName = rs->m_szFileName;

    // 下载文件统一缓存到当前程序目录的 temp 文件夹。
    QDir dir;
    if (!dir.exists(QDir::currentPath() + "/temp/"))
    {
        dir.mkpath(QDir::currentPath() + "/temp/");
    }
    info->filePath = QString("./temp/%1").arg(rs->m_szFileName);

    info->filePos = 0;
    info->fileSize = rs->m_nFileSize;
    // nginx-rtmp 需要双斜杠 "vod//" 才能正确解析含子目录的流路径
    info->rtmpUrl = QString("rtmp://%1:1935/vod//%2").arg(_DEF_SERVER_IP).arg(rs->m_rtmp);
    qDebug() << "rtmpUrl=" << info->rtmpUrl;

    info->pFile = new QFile(info->filePath);

    if (info->pFile->open(QIODevice::WriteOnly))
    {
        m_mapVideoIDToFileInfo[info->videoId] = info;
    }
    else
    {
        delete info->pFile;
        info->pFile = nullptr;
        delete info;
    }

}

void OnlineDialog::slot_fileblockRq(char *buf, int nlen)
{
    (void)nlen;

    STRU_FILEBLOCK_RQ *rq = (STRU_FILEBLOCK_RQ *)buf;

    // 调试：打印收到的 fileId 和 map 内容
    qDebug() << "slot_fileblockRq: fileId=" << rq->m_nFileId
             << "blockLen=" << rq->m_nBlockLen
             << "map size=" << m_mapVideoIDToFileInfo.size();

    // 1. 通过 fileId 在 map 中查找对应的 FileInfo（由 slot_downloadRs 创建）
    //    注意：服务端下载时用 fileId 编号（1~10），不是 videoId
    //    需要遍历 map 找到 fileId 匹配的条目
    FileInfo *info = nullptr;
    for (auto it = m_mapVideoIDToFileInfo.begin(); it != m_mapVideoIDToFileInfo.end(); ++it)
    {
        qDebug() << "  map entry: videoId=" << it.key() << "fileId=" << it.value()->fileId;
        if (it.value()->fileId == rq->m_nFileId)
        {
            info = it.value();
            break;
        }
    }

    if (!info)
    {
        qDebug() << "slot_fileblockRq: fileId not found, fileId=" << rq->m_nFileId;
        return;
    }

    // 2. 将文件块数据写入本地文件
    qint64 written = info->pFile->write(rq->m_szFileContent, rq->m_nBlockLen);
    info->filePos += written;

    // 3. 判断文件是否接收完毕
    if (info->filePos >= info->fileSize)
    {
        // 3a. 关闭文件
        info->pFile->close();
        delete info->pFile;
        info->pFile = nullptr;

        // 3b. 根据 fileId 找到对应的 VideoCoverWidget，设置 gif 和 rtmp
        QString widgetName = QString("pb_play%1").arg(rq->m_nFileId);
        VideoCoverWidget *coverWidget = this->findChild<VideoCoverWidget *>(widgetName);
        if (coverWidget)
        {
            coverWidget->setGifPath(info->filePath);
            coverWidget->setRtmp(info->rtmpUrl);
        }
        else
        {
            qDebug() << "slot_fileblockRq: widget not found, name=" << widgetName;
        }

        // 3c. 从 map 中移除并释放 FileInfo
        m_mapVideoIDToFileInfo.remove(info->videoId);
        delete info;
    }
}

void OnlineDialog::UploadFile(QString filePath, hobby hy, QString gifPath)
{
    QFileInfo info(filePath);

    std::string strName = info.fileName().toStdString();
    const char* file_name = strName.c_str();

    // 调试：确认文件名是否正确提取
    qDebug() << "UploadFile: fileName=" << QString::fromStdString(strName)
             << "filePath=" << filePath
             << "file_name_len=" << strName.length();

    STRU_UPLOAD_RQ rq;
    rq.m_nFileId = qrand()%10000;
    rq.m_nFileSize = info.size();
    strcpy_s( rq.m_szFileName , _MAX_PATH , file_name );

    QByteArray bt =  filePath.right( filePath.length() - filePath.lastIndexOf('.') -1 ).toLatin1();

    memcpy(rq.m_szFileType ,bt.data() , bt.length() );

    // When uploading the video, carry its generated gif cover name.
    // The server stores this in t_VideoInfo.picName/picPath.
    if (!gifPath.isEmpty())
    {
        std::string strGifName = QFileInfo(gifPath).fileName().toStdString();
        strcpy_s(rq.m_szGifName, _MAX_PATH, strGifName.c_str());
    }

    memcpy( rq.m_szHobby , &hy ,sizeof(hy) );
    rq.m_nUserId = m_id;

    CKernel::GetInstance()->sendData( (char*)&rq , sizeof( rq ));

    FileInfo  fi;
    fi.fileId = rq.m_nFileId;
    fi.fileName = rq.m_szFileName;
    fi.filePath = filePath;
    fi.filePos = 0;
    fi.fileSize = rq.m_nFileSize;
    fi.pFile = new QFile(filePath);

    if( fi.pFile->open(QIODevice::ReadOnly) )
    {
        while(1)
        {
            STRU_FILEBLOCK_RQ blockrq;

            int64_t res = fi.pFile->read( blockrq.m_szFileContent , _DEF_CONTENT_SIZE);
            fi.filePos += res;
            blockrq.m_nBlockLen = res ;
            blockrq.m_nFileId = rq.m_nFileId;
            blockrq.m_nUserId = m_id;

            CKernel::GetInstance()->sendData( (char* ) &blockrq , sizeof( blockrq) );
            emit SIG_updateProcess( fi.filePos , fi.fileSize);

            if( fi.filePos >= fi.fileSize )
            {
                fi.pFile->close();
                delete fi.pFile;
                fi.pFile = NULL;
                break;
            }
        }
    }
}



void OnlineDialog::slot_UploadFile(QString filePath, QString imgPath, hobby hy)
{
    qDebug() << "上传开始"
             << "filePath:" << filePath
             << "imgPath:" << imgPath
             << "food:" << hy.food
             << "song:" << hy.song
             << "fun:" << hy.fun
             << "video:" << hy.video
             << "ennegy:" << hy.ennegy
             << "outside:" << hy.outside
             << "dance:" << hy.dance
             << "edu:" << hy.edu;
    UploadFile(filePath, hy, imgPath);
    UploadFile(imgPath, hy);
}

void OnlineDialog::slot_openLiveDialog()
{
    if (m_id == 0) {
        QMessageBox::about(this, "提示", "请先登录");
        return;
    }
    m_liveDlg->setUserId(m_id);
    m_liveDlg->show();
    m_liveDlg->raise();
    m_liveDlg->activateWindow();
    slot_requestLiveList();
}

void OnlineDialog::slot_requestLiveList()
{
    if (m_id == 0) {
        return;
    }
    if (m_liveDlg) {
        m_liveDlg->clearRooms();
    }
    STRU_LIVE_LIST_RQ rq;
    rq.m_nUserId = m_id;
    CKernel::GetInstance()->sendData((char*)&rq, sizeof(rq));
}

void OnlineDialog::slot_startLive(QString title, QString coverPath, QString rtmp)
{
    if (m_id == 0) {
        QMessageBox::about(m_liveDlg, "提示", "请先登录");
        return;
    }
    if (rtmp.trimmed().isEmpty()) {
        QMessageBox::about(m_liveDlg, "提示", "RTMP 推流地址不能为空");
        return;
    }

    STRU_LIVE_START_RQ rq;
    rq.m_nUserId = m_id;
    QByteArray titleBytes = title.toLocal8Bit();
    QByteArray coverBytes = coverPath.toLocal8Bit();
    QByteArray rtmpBytes = rtmp.toLocal8Bit();
    strcpy_s(rq.m_szTitle, _MAX_PATH, titleBytes.constData());
    strcpy_s(rq.m_szCoverPath, _MAX_PATH, coverBytes.constData());
    strcpy_s(rq.m_szRtmp, _MAX_PATH, rtmpBytes.constData());
    CKernel::GetInstance()->sendData((char*)&rq, sizeof(rq));
}

void OnlineDialog::slot_stopLive(QString rtmp)
{
    if (m_id == 0) {
        return;
    }
    STRU_LIVE_STOP_RQ rq;
    rq.m_nUserId = m_id;
    QByteArray rtmpBytes = rtmp.toLocal8Bit();
    strcpy_s(rq.m_szRtmp, _MAX_PATH, rtmpBytes.constData());
    CKernel::GetInstance()->sendData((char*)&rq, sizeof(rq));
}

void OnlineDialog::slot_liveListRs(char *buf, int nlen)
{
    (void)nlen;
    if (!m_liveDlg) {
        return;
    }

    STRU_LIVE_LIST_RS *rs = (STRU_LIVE_LIST_RS *)buf;
    if (rs->m_nLiveId > 0) {
        LiveRoomInfo info;
        info.liveId = rs->m_nLiveId;
        info.userId = rs->m_nUserId;
        info.title = QString::fromLocal8Bit(rs->m_szTitle);
        info.coverPath = QString::fromLocal8Bit(rs->m_szCoverPath);
        info.rtmp = QString::fromLocal8Bit(rs->m_szRtmp);
        m_liveDlg->addLiveRoom(info);
    }
}

void OnlineDialog::slot_liveStartRs(char *buf, int nlen)
{
    (void)nlen;
    STRU_LIVE_START_RS *rs = (STRU_LIVE_START_RS *)buf;
    if (rs->m_nResult == live_success) {
        QMessageBox::about(m_liveDlg, "提示", "开播成功");
        slot_requestLiveList();
    } else {
        m_liveDlg->stopLocalPush();
        QMessageBox::about(m_liveDlg, "提示", "开播失败");
    }
}

void OnlineDialog::slot_liveStopRs(char *buf, int nlen)
{
    (void)nlen;
    STRU_LIVE_STOP_RS *rs = (STRU_LIVE_STOP_RS *)buf;
    if (rs->m_nResult == live_success) {
        QMessageBox::about(m_liveDlg, "提示", "下播成功");
        slot_requestLiveList();
    } else {
        QMessageBox::about(m_liveDlg, "提示", "下播失败");
    }
}
