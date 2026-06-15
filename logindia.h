#ifndef LOGINDIA_H
#define LOGINDIA_H

#include <QMainWindow>
#include <QMetaType>

QT_BEGIN_NAMESPACE
namespace Ui { class LoginDia; }
QT_END_NAMESPACE


struct hobby{
    int food          ;
    int song          ;
    int fun           ;
    int video         ;
    int ennegy        ;
    int outside       ;
    int dance         ;
    int edu           ;
};
Q_DECLARE_METATYPE(hobby)

class LoginDia : public QMainWindow
{
    Q_OBJECT

public:
    LoginDia(QWidget *parent = nullptr);
    ~LoginDia();



private slots:
    void on_pb_register_clicked();

    void on_pb_register_clear_clicked();

    void on_pb_login_clicked();

    void on_pb_clear_clicked();

    void on_pb_pianhao_clicked();

    void on_cb_all_stateChanged(int state);

    void on_cb_allno_stateChanged(int state);
private:
    Ui::LoginDia *ui;

signals:
    void signals_sendLoginInfo(QString tel,QString pass);
    void signals_sendRegisterInfo(QString name,QString tel ,QString pass,hobby hy);

};
#endif // LOGINDIA_H
