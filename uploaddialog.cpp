#include "uploaddialog.h"
#include "ui_uploaddialog.h"
#include "recoderdialog.h"
#include "videoplayer.h"

#include <QCoreApplication>
#include <QDebug>
#include <QDir>
#include <QFileDialog>
#include <QFileInfo>
#include <QMovie>
#include <QProcess>
#include <QTime>
#include <QMessageBox>

UploadDialog::UploadDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::UploadDialog),
    m_movie(nullptr)
{
    ui->setupUi(this);
    ui->pb_begin->setEnabled(false);
    connect(ui->pb_page2, &QPushButton::clicked,
            this, &UploadDialog::openRecorderDialog);
}

UploadDialog::~UploadDialog()
{
    delete m_movie;
    delete ui;
}

void UploadDialog::on_pb_view_clicked()
{
    QString path = QFileDialog::getOpenFileName(this, "选择要上传的文件", "./",
                                                "Video Files (*.flv *.mp4)");
    if (path.isEmpty()) {
        return;
    }

    setUploadFile(path);
}

bool UploadDialog::setUploadFile(QString filePath)
{
    QFileInfo info(filePath);
    if (!info.exists()) {
        QMessageBox::warning(this, "提示", "视频文件不存在");
        ui->pb_begin->setEnabled(false);
        return false;
    }

    ui->sw_page->setCurrentWidget(ui->page_1);
    ui->le_path->setText(filePath);

    QString imgPath = SaveVideoJpg(filePath);
    if (imgPath.isEmpty()) {
        qDebug() << "生成视频预览失败";
        ui->pb_begin->setEnabled(false);
        return false;
    }

    m_filePath = filePath;
    m_imgPath = imgPath;
    playGif(imgPath);
    ui->pb_begin->setEnabled(true);
    return true;
}

QString UploadDialog::SaveVideoJpg(QString filePath)
{
    QFileInfo videoInfo(filePath);
    if (!videoInfo.exists()) {
        return QString();
    }

    QDir appDir(QCoreApplication::applicationDirPath());
    appDir.mkpath("temp");

    QString tempDirPath = appDir.filePath("temp");
    QDir tempDir(tempDirPath);
    QString framePattern = tempDir.filePath("%02d.jpg");
    QString gifPath = tempDir.filePath(QString("%1.gif")
                                       .arg(QTime::currentTime().toString("hhmmsszzz")));

    AVFormatContext *formatCtx = nullptr;
    AVCodecContext *codecCtx = nullptr;
    AVCodec *codec = nullptr;
    AVFrame *frame = nullptr;
    AVFrame *frameRGB = nullptr;
    AVPacket *packet = nullptr;
    SwsContext *convertCtx = nullptr;
    uint8_t *outBuffer = nullptr;
    int videoStream = -1;
    int savedCount = 0;
    int numBytes = 0;
    bool ok = false;

    av_register_all();

    QByteArray fileBytes = QDir::toNativeSeparators(filePath).toLocal8Bit();
    if (avformat_open_input(&formatCtx, fileBytes.constData(), nullptr, nullptr) != 0) {
        qDebug() << "can't open video file";
        goto cleanup;
    }

    if (avformat_find_stream_info(formatCtx, nullptr) < 0) {
        qDebug() << "couldn't find stream information";
        goto cleanup;
    }

    for (unsigned int i = 0; i < formatCtx->nb_streams; ++i) {
        if (formatCtx->streams[i]->codec->codec_type == AVMEDIA_TYPE_VIDEO) {
            videoStream = static_cast<int>(i);
            break;
        }
    }

    if (videoStream == -1) {
        qDebug() << "didn't find a video stream";
        goto cleanup;
    }

    codecCtx = formatCtx->streams[videoStream]->codec;
    codec = avcodec_find_decoder(codecCtx->codec_id);
    if (!codec) {
        qDebug() << "codec not found";
        goto cleanup;
    }

    if (avcodec_open2(codecCtx, codec, nullptr) < 0) {
        qDebug() << "could not open codec";
        goto cleanup;
    }

    frame = av_frame_alloc();
    frameRGB = av_frame_alloc();
    if (!frame || !frameRGB) {
        goto cleanup;
    }

    convertCtx = sws_getContext(codecCtx->width, codecCtx->height,
                                codecCtx->pix_fmt,
                                codecCtx->width, codecCtx->height,
                                AV_PIX_FMT_RGB32,
                                SWS_BICUBIC, nullptr, nullptr, nullptr);
    if (!convertCtx) {
        goto cleanup;
    }

    numBytes = avpicture_get_size(AV_PIX_FMT_RGB32, codecCtx->width, codecCtx->height);
    outBuffer = static_cast<uint8_t *>(av_malloc(numBytes));
    if (!outBuffer) {
        goto cleanup;
    }

    avpicture_fill(reinterpret_cast<AVPicture *>(frameRGB), outBuffer,
                   AV_PIX_FMT_RGB32, codecCtx->width, codecCtx->height);

    packet = av_packet_alloc();
    if (!packet) {
        goto cleanup;
    }

    while (savedCount < 120 && av_read_frame(formatCtx, packet) >= 0) {
        if (packet->stream_index == videoStream) {
            int gotPicture = 0;
            int ret = avcodec_decode_video2(codecCtx, frame, &gotPicture, packet);
            if (ret < 0) {
                qDebug() << "decode error";
                av_packet_unref(packet);
                goto cleanup;
            }

            if (gotPicture) {
                sws_scale(convertCtx,
                          reinterpret_cast<const uint8_t * const *>(frame->data),
                          frame->linesize, 0, codecCtx->height,
                          frameRGB->data, frameRGB->linesize);

                QImage img(reinterpret_cast<uchar *>(outBuffer),
                           codecCtx->width, codecCtx->height,
                           QImage::Format_RGB32);
                QImage scaled = img.scaled(640, 320, Qt::KeepAspectRatio);
                ++savedCount;
                scaled.save(tempDir.filePath(QString("%1.jpg").arg(savedCount, 2, 10, QChar('0'))));
            }
        }
        av_packet_unref(packet);
    }

    if (savedCount <= 0) {
        goto cleanup;
    }

    {
        QString ffmpegPath = QCoreApplication::applicationDirPath() + "/ffmpeg.exe";
        if (!QFileInfo::exists(ffmpegPath)) {
            ffmpegPath = QDir::current().filePath("ffmpeg-4.2.2/bin/ffmpeg.exe");
        }

        QStringList args;
        args << "-y" << "-r" << "30" << "-i" << framePattern << gifPath;

        QProcess process;
        process.start(ffmpegPath, args);
        process.waitForFinished(-1);
        if (process.exitStatus() == QProcess::NormalExit
                && process.exitCode() == 0
                && QFileInfo::exists(gifPath)) {
            ok = true;
        } else {
            qDebug() << "ffmpeg gif failed:" << process.readAllStandardError();
        }
    }

cleanup:
    if (packet) {
        av_packet_free(&packet);
    }
    if (outBuffer) {
        av_free(outBuffer);
    }
    if (frameRGB) {
        av_frame_free(&frameRGB);
    }
    if (frame) {
        av_frame_free(&frame);
    }
    if (convertCtx) {
        sws_freeContext(convertCtx);
    }
    if (codecCtx) {
        avcodec_close(codecCtx);
    }
    if (formatCtx) {
        avformat_close_input(&formatCtx);
    }

    return ok ? gifPath : QString();
}

void UploadDialog::playGif(QString imgPath)
{
    delete m_movie;
    m_movie = new QMovie(imgPath, QByteArray(), this);
    connect(m_movie, &QMovie::frameChanged,
            this, &UploadDialog::slot_movieFrameChanged);
    m_movie->start();
}

void UploadDialog::slot_movieFrameChanged()
{
    if (m_movie) {
        ui->wdg_jpg->slot_setImage(m_movie->currentImage());
    }
}

void UploadDialog::on_pb_begin_clicked()
{
    hobby hy;
    hy.food = ui->cb_food->isChecked() ? 1 : 0;
    hy.song = ui->cb_song->isChecked() ? 1 : 0;
    hy.fun = ui->cb_fun->isChecked() ? 1 : 0;
    hy.video = ui->cb_video->isChecked() ? 1 : 0;
    hy.ennegy = ui->cb_ennegy->isChecked() ? 1 : 0;
    hy.outside = ui->cb_outside->isChecked() ? 1 : 0;
    hy.dance = ui->cb_dance->isChecked() ? 1 : 0;
    hy.edu = ui->cb_edu->isChecked() ? 1 : 0;

    emit SIG_UploadFile(m_filePath, m_imgPath, hy);
}

void UploadDialog::slot_updateProcess(qint64 cur, qint64 max)
{
    ui->pgb_upload->setMaximum(static_cast<int>(max));
    ui->pgb_upload->setValue(static_cast<int>(cur));
}

void UploadDialog::clear()
{
    ui->le_path->clear();
    ui->pb_begin->setEnabled(false);
    ui->pgb_upload->setValue(0);
    m_filePath.clear();
    m_imgPath.clear();

    if (m_movie) {
        m_movie->stop();
        delete m_movie;
        m_movie = nullptr;
    }

    ui->wdg_jpg->slot_setImage(QImage());
}

void UploadDialog::on_pb_page1_clicked()
{
    ui->sw_page->setCurrentWidget(ui->page_1);
}

void UploadDialog::openRecorderDialog()
{
    RecoderDialog *recorder = new RecoderDialog(nullptr);
    recorder->setAttribute(Qt::WA_DeleteOnClose);
    recorder->setWindowModality(Qt::NonModal);

    connect(recorder, &RecoderDialog::SIG_recordFinished,
            this, [this](QString filePath) {
        show();
        raise();
        activateWindow();
        setUploadFile(filePath);
    });

    recorder->show();
    recorder->raise();
    recorder->activateWindow();
}
