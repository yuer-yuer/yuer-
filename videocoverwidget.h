#ifndef VIDEOCOVERWIDGET_H
#define VIDEOCOVERWIDGET_H

#include <QWidget>
#include <QMovie>
#include <QTimer>
#include <QPixmap>
#include <QPaintEvent>



class VideoCoverWidget : public QWidget
{
    Q_OBJECT
public:
    explicit VideoCoverWidget(QWidget *parent = nullptr);
    ~VideoCoverWidget();

    // 设置 gif 文件路径（下载完成后调用）
    void setGifPath(const QString &path);

    // 设置 rtmp 播放地址（收到 DOWNLOAD_RS 时调用）
    void setRtmp(const QString &rtmp);
    QString rtmp() const;

    // 清空显示（刷新时调用）
    void clear();

signals:
    // 点击控件时发出，携带 rtmp 地址，供外部播放视频
    void SIG_click(QString rtmp);

protected:
    // 自绘：播放中画当前帧，停止时画封面
    void paintEvent(QPaintEvent *event) override;
    // 鼠标进入 → 启动 1 秒延迟定时器
    void enterEvent(QEvent *event) override;
    // 鼠标离开 → 停止播放，回到封面
    void leaveEvent(QEvent *event) override;
    // 鼠标点击 → 发射 SIG_click 信号
    void mousePressEvent(QMouseEvent *event) override;

private slots:
    // QMovie 每帧变化时触发重绘
    void slot_frameChanged(int frameNo);

private:
    // 1 秒延迟后真正启动播放
    void slot_hoverTimeout();

private:
    QMovie  *m_movie;           // gif 解码器
    QTimer  *m_hoverTimer;       // 鼠标悬停 1 秒定时器
    QPixmap  m_coverPix;         // 封面帧缓存（第一帧）
    QString  m_rtmpUrl;         // rtmp 播放地址
    bool     m_isPlaying;        // 当前是否在播放动画
};

#endif // VIDEOCOVERWIDGET_H
