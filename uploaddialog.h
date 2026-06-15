#ifndef UPLOADDIALOG_H
#define UPLOADDIALOG_H

#include <QDialog>
#include "logindia.h"

namespace Ui {
class UploadDialog;
}

class QMovie;

class UploadDialog : public QDialog
{
    Q_OBJECT

public:
    explicit UploadDialog(QWidget *parent = nullptr);
    ~UploadDialog();

    void clear();
    bool setUploadFile(QString filePath);

signals:
    void SIG_UploadFile(QString filePath, QString imgPath, hobby hy);

public slots:
    void on_pb_view_clicked();

    void on_pb_begin_clicked();

    void slot_updateProcess(qint64 cur, qint64 max);
    void slot_movieFrameChanged();

private slots:
    void on_pb_page1_clicked();
    void openRecorderDialog();

private:
    QString SaveVideoJpg(QString filePath);
    void playGif(QString imgPath);

    Ui::UploadDialog *ui;
    QString m_filePath;
    QString m_imgPath;
    QMovie *m_movie;
};

#endif // UPLOADDIALOG_H
