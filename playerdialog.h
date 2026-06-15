#ifndef PLAYERDIALOG_H
#define PLAYERDIALOG_H

#include <QDialog>
#include "videoplayer.h"
#include <QTimer>
#include "onlinedialog.h"
QT_BEGIN_NAMESPACE
namespace Ui { class PlayerDialog; }
QT_END_NAMESPACE

class PlayerDialog : public QDialog
{
    Q_OBJECT

public:
    PlayerDialog(QWidget *parent = nullptr);
    ~PlayerDialog();

private slots:
    void on_pb_start_clicked();
    void Slots_setImage(QImage img);

    void on_pb_resume_clicked();

    void on_pb_pause_clicked();

    void on_pb_stop_clicked();

    void slot_PlayerStateChanged(int state);
    void slot_getTotalTime(qint64  uSec);

    void slot_TimerTimeOut();

    bool eventFilter(QObject *, QEvent *);
    void on_pb_online_clicked();

private:
    Ui::PlayerDialog *ui;
    VideoPlayer * m_player;
    QTimer m_Timer;
    OnlineDialog *m_onlineDia;
public:
    int isStop;
};
#endif // PLAYERDIALOG_H
