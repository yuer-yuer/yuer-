#include "recoderdialog.h"
#include "ui_recoderdialog.h"

#include <QCoreApplication>
#include <QDateTime>
#include <QDir>
#include <QFileDialog>
#include <QFileInfo>
#include <QMessageBox>

RecoderDialog::RecoderDialog(QWidget *parent)
    : QDialog(parent)
    , ui(new Ui::RecoderDialog)
    , m_isRecording(false)
{
    ui->setupUi(this);
    m_pictureWidegt=new PictureWidget;
    m_pictureWidegt->hide();
    m_pictureWidegt->move(0,0);
    this->setWindowFlags(Qt::WindowMinMaxButtonsHint|
Qt::WindowCloseButtonHint);

    m_saveVideoThread=new SaveVideoFileThread;
    connect(m_saveVideoThread,SIGNAL(SIG_sendPicInPic(QImage)),
            m_pictureWidegt,SLOT(slot_setImage(QImage)));
    connect(m_saveVideoThread,SIGNAL(SIG_sendVideoFrame(QImage)),
             this,SLOT(slot_setImage(QImage)));

    QDir appDir(QCoreApplication::applicationDirPath());
    appDir.mkpath("record");
    QString fileName = QString("record_%1.flv")
            .arg(QDateTime::currentDateTime().toString("yyyyMMdd_hhmmss"));
    ui->le_url->setText(QDir::toNativeSeparators(appDir.filePath("record/" + fileName)));
    m_saveurl = ui->le_url->text();
}

RecoderDialog::~RecoderDialog()
{
    if (m_saveVideoThread) {
        if (m_isRecording || m_saveVideoThread->isRunning()) {
            m_saveVideoThread->slot_closeVideo();
            m_saveVideoThread->wait();
        }
        delete m_saveVideoThread;
        m_saveVideoThread = nullptr;
    }
    if (m_pictureWidegt) {
        delete m_pictureWidegt;
        m_pictureWidegt = nullptr;
    }
    delete ui;
}

QString RecoderDialog::currentSavePath() const
{
    QString path = ui->le_url->text().trimmed();
    return QDir::toNativeSeparators(path);
}

void RecoderDialog::on_pb_start_clicked()
{
    if (m_isRecording) {
        return;
    }

    m_saveurl = currentSavePath();
    if (m_saveurl.isEmpty()) {
        QMessageBox::warning(this, "提示", "请先设置录制文件保存路径");
        return;
    }

    QFileInfo info(m_saveurl);
    QDir dir = info.dir();
    if (!dir.exists() && !dir.mkpath(".")) {
        QMessageBox::warning(this, "提示", "创建录制保存目录失败");
        return;
    }

    this->showMinimized();
    m_pictureWidegt->show();

    STRU_AV_FORMAT format;

    //format.clear();
    format.fileName = m_saveurl;
    format.frame_rate = FRAME_RATE;
    format.hasAudio = true;
    format.hasCamera = true;
    format.hasDesk = true;
    format.videoBitRate = 1200000;
    QScreen *src = QApplication::primaryScreen();
    QRect rect = src->geometry();
    format.width = rect.width();
    format.height = rect.height();

    m_saveVideoThread->slot_setInfo(format);

    m_saveVideoThread->slot_openVideo();
    m_isRecording = true;
}


void RecoderDialog::on_pb_end_clicked()
{
    if (!m_isRecording) {
        return;
    }

    m_pictureWidegt->hide();
    m_saveVideoThread->slot_closeVideo();
    m_saveVideoThread->wait();
    m_isRecording = false;

    if (QFileInfo::exists(m_saveurl)) {
        emit SIG_recordFinished(m_saveurl);
        accept();
    } else {
        QMessageBox::warning(this, "提示", "录制文件保存失败");
    }
}


void RecoderDialog::on_pb_setURL_clicked()
{
    QString defaultPath = currentSavePath();
    QString path = QFileDialog::getSaveFileName(this,
                                                "选择录制视频保存位置",
                                                defaultPath,
                                                "Video Files (*.flv *.mp4);;All Files (*.*)");
    if (path.isEmpty()) {
        return;
    }

    m_saveurl = QDir::toNativeSeparators(path);
    ui->le_url->setText(m_saveurl);
}

void RecoderDialog::slot_setImage(QImage img)
{
    QPixmap pixmap;
    if(!img.isNull()){
        pixmap=QPixmap::fromImage(img.scaled(ui->lb_show->size(),Qt::KeepAspectRatio));

    }else{
        pixmap=QPixmap::fromImage(img);
    }
    ui->lb_show->setPixmap(pixmap);
}
