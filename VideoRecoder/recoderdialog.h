#ifndef RECODERDIALOG_H
#define RECODERDIALOG_H

#include <QDialog>
#include"picturewidget.h"
#include"savevideofilethread.h"
QT_BEGIN_NAMESPACE
namespace Ui { class RecoderDialog; }
QT_END_NAMESPACE

class RecoderDialog : public QDialog
{
    Q_OBJECT

public:
    RecoderDialog(QWidget *parent = nullptr);
    ~RecoderDialog();

signals:
    void SIG_recordFinished(QString filePath);

public slots:
    void slot_setImage(QImage img);

    void on_pb_start_clicked();

    void on_pb_end_clicked();

    void on_pb_setURL_clicked();

private:
    QString currentSavePath() const;

    Ui::RecoderDialog *ui;
    PictureWidget*m_pictureWidegt;
    SaveVideoFileThread *m_saveVideoThread;

    QString m_saveurl;
    bool m_isRecording;
};
#endif // RECODERDIALOG_H
