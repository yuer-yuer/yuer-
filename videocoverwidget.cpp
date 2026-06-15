#include "videocoverwidget.h"
#include <QPainter>
#include <QMouseEvent>
#include <QDebug>
VideoCoverWidget::VideoCoverWidget(QWidget *parent)
    : QWidget(parent)
    , m_movie(nullptr)
    , m_hoverTimer(new QTimer(this))
    , m_isPlaying(false)
{
    // 悬停 1 秒后才开始播放
    m_hoverTimer->setSingleShot(true);
    m_hoverTimer->setInterval(1000);
    connect(m_hoverTimer, &QTimer::timeout,
            this, &VideoCoverWidget::slot_hoverTimeout);

    setMouseTracking(true);
}

VideoCoverWidget::~VideoCoverWidget()
{
    delete m_movie;
}

void VideoCoverWidget::setGifPath(const QString &path)
{
    // 如果已有旧 movie，先清理
    if (m_movie) {
        m_movie->stop();
        delete m_movie;
        m_movie = nullptr;
    }

    m_movie = new QMovie(path, QByteArray(), this);
    if (!m_movie->isValid()) {
        delete m_movie;
        m_movie = nullptr;
        return;
    }

    // 连接帧变化信号
    connect(m_movie, &QMovie::frameChanged,
            this, &VideoCoverWidget::slot_frameChanged);

    // 跳到第一帧，缓存为封面
    m_movie->jumpToFrame(0);
    m_coverPix = m_movie->currentPixmap();

    // 停在第一帧，不自动播放
    m_movie->stop();
    m_isPlaying = false;

    update();
}

void VideoCoverWidget::setRtmp(const QString &rtmp)
{
    m_rtmpUrl = rtmp;
}

QString VideoCoverWidget::rtmp() const
{
    return m_rtmpUrl;
}

void VideoCoverWidget::clear()
{
    if (m_movie) {
        m_movie->stop();
        delete m_movie;
        m_movie = nullptr;
    }
    m_coverPix = QPixmap();
    m_rtmpUrl.clear();
    m_isPlaying = false;
    m_hoverTimer->stop();
    update();
}

// ========== 绘制 ==========

void VideoCoverWidget::paintEvent(QPaintEvent *)
{
    QPainter painter(this);
    painter.setRenderHint(QPainter::SmoothPixmapTransform);

    if (m_isPlaying && m_movie && m_movie->state() == QMovie::Running) {
        // 播放中：画当前帧
        QPixmap frame = m_movie->currentPixmap();
        if (!frame.isNull()) {
            painter.drawPixmap(rect(), frame);
            return;
        }
    }

    // 未播放：画封面（第一帧）
    if (!m_coverPix.isNull()) {
        painter.drawPixmap(rect(), m_coverPix);
    } else {
        // 没有任何内容，画占位背景
        painter.fillRect(rect(), Qt::black);
        painter.setPen(Qt::white);
        painter.drawText(rect(), Qt::AlignCenter, "暂无视频");
    }
}

// ========== 鼠标事件 ==========

void VideoCoverWidget::enterEvent(QEvent *)
{
    // 鼠标进入：启动 1 秒延迟定时器
    if (m_movie) {
        m_hoverTimer->start();
    }
}

void VideoCoverWidget::leaveEvent(QEvent *)
{
    // 鼠标离开：停止定时器 + 停止播放 + 回到封面
    m_hoverTimer->stop();

    if (m_movie && m_isPlaying) {
        m_movie->stop();
        m_isPlaying = false;
        update();
    }
}

void VideoCoverWidget::mousePressEvent(QMouseEvent *)
{
    // 点击控件，发出信号通知外部播放视频
    if (!m_rtmpUrl.isEmpty()) {
        emit SIG_click(m_rtmpUrl);
        qDebug()<<m_rtmpUrl;
    }
}

// ========== 私有槽 ==========

void VideoCoverWidget::slot_hoverTimeout()
{
    // 悬停 1 秒到了，开始播放 gif
    if (m_movie) {
        m_movie->start();
        m_isPlaying = true;
    }
}

void VideoCoverWidget::slot_frameChanged(int frameNo)
{
    Q_UNUSED(frameNo);
    // 每帧变化时重绘
    update();
}
