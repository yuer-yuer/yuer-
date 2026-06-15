#include "livedialog.h"

#include <QCloseEvent>
#include <QComboBox>
#include <QCoreApplication>
#include <QDir>
#include <QFileDialog>
#include <QFileInfo>
#include <QGridLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QMessageBox>
#include <QMouseEvent>
#include <QPixmap>
#include <QProcess>
#include <QPushButton>
#include <QScrollArea>
#include <QVBoxLayout>

#include "packdef.h"

#ifndef _DEF_SERVER_IP
#define _DEF_SERVER_IP "192.168.75.135"
#endif

LiveRoomCard::LiveRoomCard(const LiveRoomInfo &info, QWidget *parent)
    : QWidget(parent),
      m_rtmp(info.rtmp)
{
    setFixedSize(170, 140);
    setCursor(Qt::PointingHandCursor);
    setStyleSheet("LiveRoomCard{border:1px solid #d8dde6;background:#ffffff;}"
                  "LiveRoomCard:hover{border-color:#3b82f6;background:#f8fbff;}");

    QVBoxLayout *layout = new QVBoxLayout(this);
    layout->setContentsMargins(8, 8, 8, 8);
    layout->setSpacing(6);

    QLabel *cover = new QLabel(this);
    cover->setFixedSize(154, 86);
    cover->setAlignment(Qt::AlignCenter);
    cover->setStyleSheet("background:#1f2937;color:#ffffff;");

    QPixmap pix(info.coverPath);
    if (!pix.isNull()) {
        cover->setPixmap(pix.scaled(cover->size(), Qt::KeepAspectRatioByExpanding, Qt::SmoothTransformation));
    } else {
        cover->setText("LIVE");
    }

    QLabel *title = new QLabel(info.title.isEmpty() ? QString("未命名直播") : info.title, this);
    title->setFixedHeight(22);
    title->setAlignment(Qt::AlignLeft | Qt::AlignVCenter);
    title->setStyleSheet("font-size:13px;color:#111827;");

    QLabel *rtmp = new QLabel(info.rtmp, this);
    rtmp->setFixedHeight(16);
    rtmp->setStyleSheet("font-size:10px;color:#6b7280;");

    layout->addWidget(cover);
    layout->addWidget(title);
    layout->addWidget(rtmp);
}

void LiveRoomCard::mousePressEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        emit SIG_clicked(m_rtmp);
    }
    QWidget::mousePressEvent(event);
}

PushLiveDialog::PushLiveDialog(QWidget *parent)
    : QDialog(parent),
      m_userId(0),
      m_titleEdit(nullptr),
      m_coverEdit(nullptr),
      m_cameraCombo(nullptr),
      m_audioCombo(nullptr),
      m_rtmpEdit(nullptr),
      m_ffmpegProcess(new QProcess(this)),
      m_isPushing(false)
{
    setWindowTitle("我要直播");
    setMinimumSize(680, 260);

    QVBoxLayout *root = new QVBoxLayout(this);
    root->setContentsMargins(16, 16, 16, 16);
    root->setSpacing(10);

    m_titleEdit = new QLineEdit(this);
    m_titleEdit->setPlaceholderText("直播标题");

    QHBoxLayout *coverRow = new QHBoxLayout;
    m_coverEdit = new QLineEdit(this);
    m_coverEdit->setPlaceholderText("封面路径");
    QPushButton *chooseCover = new QPushButton("选择封面", this);
    coverRow->addWidget(m_coverEdit, 1);
    coverRow->addWidget(chooseCover);

    QHBoxLayout *deviceRow = new QHBoxLayout;
    m_cameraCombo = new QComboBox(this);
    m_cameraCombo->setEditable(true);
    m_cameraCombo->setMinimumWidth(220);
    m_audioCombo = new QComboBox(this);
    m_audioCombo->setEditable(true);
    m_audioCombo->setMinimumWidth(220);
    QPushButton *refreshDevice = new QPushButton("刷新设备", this);
    deviceRow->addWidget(m_cameraCombo, 1);
    deviceRow->addWidget(m_audioCombo, 1);
    deviceRow->addWidget(refreshDevice);

    m_rtmpEdit = new QLineEdit(this);
    m_rtmpEdit->setPlaceholderText("RTMP 推流地址");

    QHBoxLayout *buttonRow = new QHBoxLayout;
    buttonRow->addStretch();
    QPushButton *start = new QPushButton("开播", this);
    QPushButton *stop = new QPushButton("下播", this);
    buttonRow->addWidget(start);
    buttonRow->addWidget(stop);

    root->addWidget(new QLabel("标题", this));
    root->addWidget(m_titleEdit);
    root->addWidget(new QLabel("封面", this));
    root->addLayout(coverRow);
    root->addWidget(new QLabel("采集设备（左侧摄像头，右侧麦克风）", this));
    root->addLayout(deviceRow);
    root->addWidget(new QLabel("推流地址", this));
    root->addWidget(m_rtmpEdit);
    root->addLayout(buttonRow);

    connect(chooseCover, &QPushButton::clicked, this, &PushLiveDialog::slot_chooseCover);
    connect(refreshDevice, &QPushButton::clicked, this, &PushLiveDialog::slot_refreshDevices);
    connect(start, &QPushButton::clicked, this, &PushLiveDialog::slot_startLive);
    connect(stop, &QPushButton::clicked, this, &PushLiveDialog::slot_stopLive);

    slot_refreshDevices();
}

PushLiveDialog::~PushLiveDialog()
{
    stopFfmpegPush();
}

void PushLiveDialog::setUserId(int userId)
{
    m_userId = userId;
    if (m_rtmpEdit->text().trimmed().isEmpty()) {
        m_rtmpEdit->setText(defaultRtmp());
    }
}

void PushLiveDialog::stopLocalPush()
{
    stopLiveAndNotify();
}

void PushLiveDialog::slot_chooseCover()
{
    QString path = QFileDialog::getOpenFileName(this, "选择直播封面", "./",
                                                "图片 (*.png *.jpg *.jpeg *.gif);;所有文件 (*.*)");
    if (!path.isEmpty()) {
        m_coverEdit->setText(path);
    }
}

void PushLiveDialog::slot_refreshDevices()
{
    QStringList args;
    args << "-list_devices" << "true" << "-f" << "dshow" << "-i" << "dummy";

    QProcess process;
    process.setProcessChannelMode(QProcess::MergedChannels);
    process.start(ffmpegPath(), args);
    process.waitForFinished(5000);

    QString output = QString::fromUtf8(process.readAllStandardOutput());
    QStringList videoDevices;
    QStringList audioDevices;
    parseDeviceList(output, videoDevices, audioDevices);

    m_cameraCombo->clear();
    m_audioCombo->clear();

    if (videoDevices.isEmpty()) {
        m_cameraCombo->addItem("HD Webcam");
    } else {
        m_cameraCombo->addItems(videoDevices);
    }

    m_audioCombo->addItem("不使用麦克风", QString());
    m_audioCombo->addItems(audioDevices);
}

void PushLiveDialog::slot_startLive()
{
    QString title = m_titleEdit->text().trimmed();
    QString cover = m_coverEdit->text().trimmed();
    QString cameraName = m_cameraCombo->currentText().trimmed();
    QString audioName = m_audioCombo->currentData().toString();
    if (audioName.isEmpty() && m_audioCombo->currentIndex() > 0) {
        audioName = m_audioCombo->currentText().trimmed();
    }

    QString rtmp = m_rtmpEdit->text().trimmed();
    if (rtmp.isEmpty()) {
        rtmp = defaultRtmp();
        m_rtmpEdit->setText(rtmp);
    }
    if (cameraName.isEmpty()) {
        QMessageBox::warning(this, "提示", "请选择摄像头");
        return;
    }
    if (!startFfmpegPush(cameraName, audioName, rtmp)) {
        return;
    }
    m_isPushing = true;
    m_currentRtmp = rtmp;
    emit SIG_startLive(title, cover, rtmp);
}

void PushLiveDialog::slot_stopLive()
{
    stopLiveAndNotify();
}

void PushLiveDialog::closeEvent(QCloseEvent *event)
{
    stopLiveAndNotify();
    QDialog::closeEvent(event);
}

QString PushLiveDialog::defaultRtmp() const
{
    return QString("rtmp://%1/videotest/user=%2").arg(_DEF_SERVER_IP).arg(m_userId);
}

QString PushLiveDialog::ffmpegPath() const
{
    QString appPath = QDir(QCoreApplication::applicationDirPath()).filePath("ffmpeg.exe");
    if (QFileInfo::exists(appPath)) {
        return appPath;
    }

    QString cwdPath = QDir::current().filePath("ffmpeg-4.2.2/bin/ffmpeg.exe");
    if (QFileInfo::exists(cwdPath)) {
        return QDir::cleanPath(cwdPath);
    }

    QString projectPath = QDir(QCoreApplication::applicationDirPath()).filePath("../ffmpeg-4.2.2/bin/ffmpeg.exe");
    if (QFileInfo::exists(projectPath)) {
        return QDir::cleanPath(projectPath);
    }

    return QString("ffmpeg.exe");
}

void PushLiveDialog::parseDeviceList(const QString &output, QStringList &videoDevices, QStringList &audioDevices) const
{
    enum DeviceSection { None, Video, Audio };
    DeviceSection section = None;
    const QStringList lines = output.split('\n');

    for (QString line : lines) {
        line = line.trimmed();
        if (line.contains("DirectShow video devices")) {
            section = Video;
            continue;
        }
        if (line.contains("DirectShow audio devices")) {
            section = Audio;
            continue;
        }
        if (line.contains("Alternative name")) {
            continue;
        }

        int firstQuote = line.indexOf('"');
        int secondQuote = line.indexOf('"', firstQuote + 1);
        if (firstQuote < 0 || secondQuote <= firstQuote) {
            continue;
        }

        QString name = line.mid(firstQuote + 1, secondQuote - firstQuote - 1).trimmed();
        if (name.isEmpty()) {
            continue;
        }

        if (section == Video && !videoDevices.contains(name)) {
            videoDevices.push_back(name);
        } else if (section == Audio && !audioDevices.contains(name)) {
            audioDevices.push_back(name);
        }
    }
}

bool PushLiveDialog::startFfmpegPush(const QString &cameraName, const QString &audioName, const QString &rtmp)
{
    if (m_ffmpegProcess->state() != QProcess::NotRunning) {
        QMessageBox::information(this, "提示", "直播推流已经在运行");
        return true;
    }

    QString input = QString("video=%1").arg(cameraName);
    if (!audioName.trimmed().isEmpty()) {
        input += QString(":audio=%1").arg(audioName.trimmed());
    }

    QStringList args;
    args << "-f" << "dshow"
         << "-i" << input
         << "-vcodec" << "libx264"
         << "-preset" << "ultrafast"
         << "-tune" << "zerolatency";
    if (!audioName.trimmed().isEmpty()) {
        args << "-acodec" << "aac";
    }
    args << "-f" << "flv" << rtmp;

    m_ffmpegProcess->setProcessChannelMode(QProcess::MergedChannels);
    m_ffmpegProcess->start(ffmpegPath(), args);
    if (!m_ffmpegProcess->waitForStarted(3000)) {
        QMessageBox::warning(this, "提示", QString("启动 ffmpeg 失败：%1").arg(m_ffmpegProcess->errorString()));
        return false;
    }

    if (m_ffmpegProcess->waitForFinished(1000)) {
        QString output = QString::fromUtf8(m_ffmpegProcess->readAllStandardOutput());
        if (output.isEmpty()) {
            output = m_ffmpegProcess->errorString();
        }
        QMessageBox::warning(this, "提示", QString("ffmpeg 推流失败：\n%1").arg(output));
        return false;
    }

    return true;
}

void PushLiveDialog::stopFfmpegPush()
{
    if (m_ffmpegProcess->state() == QProcess::NotRunning) {
        return;
    }

    m_ffmpegProcess->terminate();
    if (!m_ffmpegProcess->waitForFinished(3000)) {
        m_ffmpegProcess->kill();
        m_ffmpegProcess->waitForFinished(1000);
    }
}

void PushLiveDialog::stopLiveAndNotify()
{
    QString rtmp = m_currentRtmp.isEmpty() ? m_rtmpEdit->text().trimmed() : m_currentRtmp;
    bool wasPushing = m_isPushing || m_ffmpegProcess->state() != QProcess::NotRunning;

    stopFfmpegPush();

    if (wasPushing) {
        m_isPushing = false;
        m_currentRtmp.clear();
        emit SIG_stopLive(rtmp);
    }
}

LiveDialog::LiveDialog(QWidget *parent)
    : QDialog(parent),
      m_userId(0),
      m_emptyLabel(nullptr),
      m_roomContainer(nullptr),
      m_roomGrid(nullptr),
      m_pushDialog(new PushLiveDialog(this))
{
    setWindowTitle("直播间");
    setMinimumSize(760, 520);

    QVBoxLayout *root = new QVBoxLayout(this);
    root->setContentsMargins(12, 12, 12, 12);
    root->setSpacing(10);

    QHBoxLayout *top = new QHBoxLayout;
    QLabel *title = new QLabel("正在直播", this);
    title->setStyleSheet("font-size:18px;font-weight:bold;color:#111827;");
    QPushButton *startLive = new QPushButton("我要直播", this);
    QPushButton *refresh = new QPushButton("刷新", this);
    top->addWidget(title);
    top->addStretch();
    top->addWidget(startLive);
    top->addWidget(refresh);

    m_roomContainer = new QWidget(this);
    m_roomGrid = new QGridLayout(m_roomContainer);
    m_roomGrid->setContentsMargins(8, 8, 8, 8);
    m_roomGrid->setHorizontalSpacing(12);
    m_roomGrid->setVerticalSpacing(12);

    QScrollArea *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setWidget(m_roomContainer);

    m_emptyLabel = new QLabel("暂无直播间", this);
    m_emptyLabel->setAlignment(Qt::AlignCenter);
    m_emptyLabel->setStyleSheet("font-size:16px;color:#6b7280;");

    root->addLayout(top);
    root->addWidget(scroll, 1);
    root->addWidget(m_emptyLabel);

    connect(startLive, &QPushButton::clicked, this, &LiveDialog::slot_openPushDialog);
    connect(refresh, &QPushButton::clicked, this, &LiveDialog::SIG_refreshLiveList);
    connect(m_pushDialog, &PushLiveDialog::SIG_startLive,
            this, &LiveDialog::SIG_startLive);
    connect(m_pushDialog, &PushLiveDialog::SIG_stopLive,
            this, &LiveDialog::SIG_stopLive);
}

LiveDialog::~LiveDialog()
{
    stopLocalPush();
}

void LiveDialog::setUserId(int userId)
{
    m_userId = userId;
    m_pushDialog->setUserId(userId);
}

void LiveDialog::clearRooms()
{
    m_rooms.clear();
    rebuildRoomGrid();
}

void LiveDialog::addLiveRoom(const LiveRoomInfo &info)
{
    m_rooms.push_back(info);
    rebuildRoomGrid();
}

void LiveDialog::stopLocalPush()
{
    m_pushDialog->stopLocalPush();
}

void LiveDialog::slot_openPushDialog()
{
    m_pushDialog->setUserId(m_userId);
    m_pushDialog->show();
    m_pushDialog->raise();
    m_pushDialog->activateWindow();
}

void LiveDialog::closeEvent(QCloseEvent *event)
{
    stopLocalPush();
    QDialog::closeEvent(event);
}

void LiveDialog::rebuildRoomGrid()
{
    while (QLayoutItem *item = m_roomGrid->takeAt(0)) {
        if (item->widget()) {
            item->widget()->deleteLater();
        }
        delete item;
    }

    m_emptyLabel->setVisible(m_rooms.isEmpty());
    m_roomContainer->setVisible(!m_rooms.isEmpty());

    for (int i = 0; i < m_rooms.size(); ++i) {
        LiveRoomCard *card = new LiveRoomCard(m_rooms.at(i), m_roomContainer);
        connect(card, &LiveRoomCard::SIG_clicked, this, &LiveDialog::SIG_playLive);
        m_roomGrid->addWidget(card, i / 4, i % 4);
    }
    m_roomGrid->setRowStretch((m_rooms.size() + 3) / 4, 1);
}
