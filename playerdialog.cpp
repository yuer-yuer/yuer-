#include "playerdialog.h"
#include "ui_playerdialog.h"
#include <QPixmap>
#include <QFileDialog>
#include <QMessageBox>
#include <QTimer>
#define DEF_PATH "http://192.168.75.133:80/hls/output.m3u8"
#define DEF_LIVE_PATH "rtmp://192.168.75.133:1935/videotest/user=100"
PlayerDialog::PlayerDialog(QWidget *parent)
    : QDialog(parent)
    , ui(new Ui::PlayerDialog)
{
    ui->setupUi(this);
    m_player=new VideoPlayer;
    connect(m_player,SIGNAL(SIG_getOneImage(QImage))
            ,this,SLOT(Slots_setImage(QImage)));

    //m_player->setFileName(DEF_PATH);
    //connect(&m_Timer,SLOT(timeout()),)
    slot_PlayerStateChanged(PlayerState::Stop);
    connect(m_player,SIGNAL(SIG_PlayerStateChanged(int)),this
            ,SLOT(slot_PlayerStateChanged(int)));
    connect(m_player,SIGNAL(SIG_TotalTime(qint64)),
            this,SLOT(slot_getTotalTime(qint64)));
    connect(&m_Timer,SIGNAL (timeout()),this,SLOT(slot_TimerTimeOut()));
    m_Timer.setInterval(500);
    //安装事件过滤器，让该对象成为被观察对象让this执行函数
    ui->slider_progress->installEventFilter(this);

    m_onlineDia=new OnlineDialog();
    m_onlineDia->hide();
    connect(m_onlineDia, &OnlineDialog::SIG_playRtmp,
            this, [this](QString rtmp){
        m_player->stop(true);
        if (m_player->isRunning()) {
            m_player->wait();
        }
        m_player->setFileName(rtmp);
        ui->lb_videoName->setText(rtmp);
        slot_PlayerStateChanged(PlayerState::Playing);
    });
}

PlayerDialog::~PlayerDialog()
{

    delete ui;
    delete m_player;
    if(m_onlineDia){
        delete m_onlineDia;
        m_onlineDia=nullptr;
    }
}

void PlayerDialog::slot_PlayerStateChanged(int state)
{
    switch( state )
    {
    case PlayerState::Stop:
        qDebug()<< "VideoPlayer::Stop";
        m_Timer.stop();
        ui->slider_progress->setValue(0);
        ui->lb_totalTime->setText("00:00:00");
        ui->lb_curTime->setText("00:00:00");
        ui->pb_pause->hide();
        ui->pb_resume->show();
        ui->lb_videoName->setText("未播放");
    {
        QImage img;
        img.fill( Qt::black);
        m_player->SendGetOneImage(img );
    }
        this->update();
        isStop = true;
        break;
    case PlayerState::Playing:
        qDebug()<< "VideoPlayer::Playing";
        ui->pb_resume->hide();
        ui->pb_pause->show();
        m_Timer.start();
        this->update();
        isStop = false;
        break;
    }
}

void PlayerDialog::slot_getTotalTime(qint64 uSec)
{
    qint64  Sec  =  uSec/1000000 ;
    ui->slider_progress->setRange(0,Sec);//精确到秒
    QString  hStr  =  QString ("00%1").arg(Sec/3600);
    QString  mStr  =  QString ("00%1").arg(Sec/60);
    QString  sStr  =  QString ("00%1").arg(Sec%60);
    QString  str  = QString ("%1:%2:%3").arg(hStr.right(2)).arg(mStr.right(2)).arg(sStr.right(2));
    ui->lb_totalTime->setText(str);
}

void PlayerDialog::on_pb_start_clicked()
{

    //打开文件 弹出对话框 参数:父窗口, 标题, 默认路径, 筛选器
    QString path = QFileDialog::getOpenFileName(this,"选择要播放的文件" , "F:/",
                                                "视频文件 (*.flv *.rmvb *.avi *.MP4 *.mkv);; 所有文件(*.*);;");
    if(!path.isEmpty())
    {
        qDebug()<< path ;
        QFileInfo info(path);
        if( info.exists() )
        {
            m_player->stop( true ); //如果播放 你要先关闭
            // 确保线程完全结束后再开新的
            if( m_player->isRunning() )
            {
                m_player->wait();
            }
            m_player->setFileName(path);
            ui->lb_videoName->setText( info.baseName() );
            slot_PlayerStateChanged(PlayerState::Playing);
        }
        else
        {
            QMessageBox::information( this, "提示" , "打开文件失败");
        }
    }

}

void PlayerDialog::Slots_setImage(QImage img)
{
    //pixmap
    //缩放
//    QPixmap pixmap;
//    if(!img.isNull()){
//        pixmap=QPixmap::fromImage(img.scaled(ui->lb_show->size(),Qt::KeepAspectRatio));
//    }
//    else{
//        pixmap=QPixmap::fromImage(img);
//    }
//    ui->lb_show->setPixmap(pixmap);

    //使用openGL提升绘图质量
    ui->wdg_show->slot_setImage(img);
}


void PlayerDialog::on_pb_resume_clicked()
{
    if( isStop ) return;
    m_player->play();
    if(m_player->playerState() == PlayerState::Playing)
    {
        ui->pb_resume->hide();
        ui->pb_pause->show();
        this->update();
    }
}


void PlayerDialog::on_pb_pause_clicked()
{
    if( isStop ) return;//停止状态自然不能播放
    m_player->pause();
    if( m_player->playerState() == PlayerState::Pause)
    {
        ui->pb_pause->hide();
        ui->pb_resume->show();

        this->update();
    }
}


void PlayerDialog::on_pb_stop_clicked()
{
    m_player->stop(true);
}

//获取当前视频时间定时器
void  PlayerDialog::slot_TimerTimeOut()
{
    if  (QObject::sender()  ==  &m_Timer)
    {
        qint64  Sec  =  m_player->getCurrentTime()/1000000 ;
        ui->slider_progress->setValue(Sec);
        QString  hStr  =  QString ("00%1").arg(Sec/3600);
        QString  mStr  =  QString ("00%1").arg(Sec/60%60);
        QString  sStr  =  QString ("00%1").arg(Sec%60);
        QString  str  =
                QString ("%1:%2:%3").arg(hStr.right(2)).arg(mStr.right(2)).arg(sStr.right(2));
        ui->lb_curTime->setText(str);
        if (ui->slider_progress->value()  ==  ui->slider_progress->maximum()
                &&  m_player->playerState()  ==  PlayerState ::Stop)
        {
            slot_PlayerStateChanged(  PlayerState ::Stop  );
        }else  if (ui->slider_progress->value()  +  1    ==
                   ui->slider_progress->maximum()
                   &&  m_player->playerState()  ==  PlayerState ::Stop)
        {
            slot_PlayerStateChanged(  PlayerState ::Stop  );
        }
    }
}

//可扩展（空格暂停，上下调音量，左右快进快退）
#include<QMouseEvent>
#include<QStyle>
bool PlayerDialog::eventFilter(QObject *obj, QEvent *event)
{
    if (obj == ui->slider_progress) {
        if (event->type() == QEvent::MouseButtonPress) {
            QMouseEvent *mouseEvent = static_cast<QMouseEvent*>(event);
            int min=ui->slider_progress->minimum();
            int max=ui->slider_progress->maximum();
            int value=QStyle::sliderValueFromPosition(
                        min,  max,  mouseEvent->pos().x(), ui->slider_progress->width());
            m_Timer.stop();
            ui->slider_progress->setValue(value);
            m_player->seek((qint64)value*1000000);
            m_Timer.start();
            return true;
        } else {
            return false;
        }
        // pass the event on to the parent class
        return QDialog::eventFilter(obj, event);
    }
}

void PlayerDialog::on_pb_online_clicked()
{
    m_onlineDia->show();
}

