#ifndef ONLINEDIALOG_H
#define ONLINEDIALOG_H

#include <QDialog>
#include <QShowEvent>
#include "logindia.h"
#include "packdef.h"
#include "uploaddialog.h"
#include <qmap.h>

namespace Ui {
class OnlineDialog;
}

class LiveDialog;

class OnlineDialog : public QDialog
{
    Q_OBJECT

public:
    explicit OnlineDialog(QWidget *parent = nullptr);
    ~OnlineDialog();
signals:
    // 点击推荐视频封面，携带 rtmp 地址，通知 PlayerDialog 播放
    void SIG_playRtmp(QString rtmp);

    void SIG_updateProcess(int64_t,int64_t);
private slots:
    void on_pb_login_clicked();

    void slot_loginCommit(QString tel, QString password);
    void slot_registerCommit(QString name,QString tel, QString password, hobby hy);
    void slot_ReadyData(uint from,char* buf,int nlen);
    void slot_loginRs(char *buf, int nlen);
    void slot_registerRs(char *buf, int nlen);
    void UploadFile(QString filePath, hobby hy, QString gifPath = QString());
    void slot_uploadRs(char *buf, int nlen);
    void slot_downloadRs(char *buf, int nlen);
    void slot_fileblockRq(char *buf, int nlen);
    void slot_liveListRs(char *buf, int nlen);
    void slot_liveStartRs(char *buf, int nlen);
    void slot_liveStopRs(char *buf, int nlen);

    void slot_UploadFile(QString filePath, QString imgPath, hobby hy);
    void on_pb_upload_clicked();
    void slot_openLiveDialog();
    void slot_requestLiveList();
    void slot_startLive(QString title, QString coverPath, QString rtmp);
    void slot_stopLive(QString rtmp);
protected:
    void showEvent(QShowEvent *event);
private:
    Ui::OnlineDialog *ui;
    LoginDia *m_login;
    UploadDialog *m_uploadDlg;
    LiveDialog *m_liveDlg;
    bool m_netOpened;
    QString m_userName;
    int m_id;
    QMap<int, FileInfo*> m_mapVideoIDToFileInfo;
};

#endif // ONLINEDIALOG_H
