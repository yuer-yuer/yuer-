#ifndef LIVEDIALOG_H
#define LIVEDIALOG_H

#include <QDialog>
#include <QList>
#include <QWidget>

class QGridLayout;
class QLabel;
class QComboBox;
class QLineEdit;
class QProcess;
class QPushButton;
class QVBoxLayout;

struct LiveRoomInfo
{
    int liveId;
    int userId;
    QString title;
    QString coverPath;
    QString rtmp;
};

class LiveRoomCard : public QWidget
{
    Q_OBJECT
public:
    explicit LiveRoomCard(const LiveRoomInfo &info, QWidget *parent = nullptr);

signals:
    void SIG_clicked(QString rtmp);

protected:
    void mousePressEvent(QMouseEvent *event) override;

private:
    QString m_rtmp;
};

class PushLiveDialog : public QDialog
{
    Q_OBJECT
public:
    explicit PushLiveDialog(QWidget *parent = nullptr);
    ~PushLiveDialog();

    void setUserId(int userId);
    void stopLocalPush();

signals:
    void SIG_startLive(QString title, QString coverPath, QString rtmp);
    void SIG_stopLive(QString rtmp);

private slots:
    void slot_chooseCover();
    void slot_refreshDevices();
    void slot_startLive();
    void slot_stopLive();

protected:
    void closeEvent(QCloseEvent *event) override;

private:
    QString defaultRtmp() const;
    QString ffmpegPath() const;
    void parseDeviceList(const QString &output, QStringList &videoDevices, QStringList &audioDevices) const;
    bool startFfmpegPush(const QString &cameraName, const QString &audioName, const QString &rtmp);
    void stopFfmpegPush();
    void stopLiveAndNotify();

    int m_userId;
    QLineEdit *m_titleEdit;
    QLineEdit *m_coverEdit;
    QComboBox *m_cameraCombo;
    QComboBox *m_audioCombo;
    QLineEdit *m_rtmpEdit;
    QProcess *m_ffmpegProcess;
    bool m_isPushing;
    QString m_currentRtmp;
};

class LiveDialog : public QDialog
{
    Q_OBJECT
public:
    explicit LiveDialog(QWidget *parent = nullptr);
    ~LiveDialog();

    void setUserId(int userId);
    void clearRooms();
    void addLiveRoom(const LiveRoomInfo &info);
    void stopLocalPush();

signals:
    void SIG_refreshLiveList();
    void SIG_startLive(QString title, QString coverPath, QString rtmp);
    void SIG_stopLive(QString rtmp);
    void SIG_playLive(QString rtmp);

private slots:
    void slot_openPushDialog();

protected:
    void closeEvent(QCloseEvent *event) override;

private:
    void rebuildRoomGrid();

    int m_userId;
    QList<LiveRoomInfo> m_rooms;
    QLabel *m_emptyLabel;
    QWidget *m_roomContainer;
    QGridLayout *m_roomGrid;
    PushLiveDialog *m_pushDialog;
};

#endif
