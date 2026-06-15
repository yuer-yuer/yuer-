#include "logindia.h"
#include "ui_logindia.h"
#include <QMessageBox>
#include <QDebug>

LoginDia::LoginDia(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::LoginDia)
{
    resize(1800, 1600);
    ui->setupUi(this);
    qRegisterMetaType<hobby>("hobby");
}

LoginDia::~LoginDia()
{
    qDebug()<<"~LoginDia()";
    delete ui;
}

//注册按钮
void LoginDia::on_pb_register_clicked()
{
    //先获取注册信息
    QString name =ui->le_name->text().trimmed();
    QString tel =ui->le_register_tel->text().trimmed();
    QString pass =ui->le_register_pass->text().trimmed();
    QString passAgain =ui->le_pass_again->text().trimmed();
    //校验
    if(name.isEmpty() ||tel.isEmpty() || pass.isEmpty()||passAgain.isEmpty())
    {
        QMessageBox::warning(this,"警告","注册信息不能为空");
        return;
    }

    //tel 11位数字
    if(tel.size()!=11)
    {
       QMessageBox::warning(this,"警告","电话号码太长或太短");
       return;
    }

    for(int i=0;i<11;++i)
    {
        if(tel[i]<'0' ||tel[i]>'9')
        {
            QMessageBox::warning(this,"警告","电话号码只能为数字");
            return;
        }
    }

    //判断两次输入的密码是否一致
    if(pass!=passAgain)
    {
        QMessageBox::warning(this,"警告","两次输入的密码不一致，请重新输入");
        return;
    }
    hobby hy;
    hy.food     =ui->cb_food   ->isChecked() ? 50:0;
    hy.song     =ui->cb_song   ->isChecked() ? 50:0;
    hy.fun      =ui->cb_fun    ->isChecked() ? 50:0;
    hy.video    =ui->cb_video  ->isChecked() ? 50:0;
    hy.ennegy   =ui->cb_ennegy ->isChecked() ? 50:0;
    hy.outside  =ui->cb_outside->isChecked() ? 50:0;
    hy.dance    =ui->cb_dance  ->isChecked() ? 50:0;
    hy.edu      =ui->cb_edu    ->isChecked() ? 50:0;
    //发送注册信息
    emit signals_sendRegisterInfo(name,tel,pass,hy);
}


void LoginDia::on_pb_register_clear_clicked()
{
    ui->le_name->clear();
    ui->le_register_tel->clear();
    ui->le_register_pass->clear();
    ui->le_pass_again->clear();

    ui->cb_all      ->setChecked(false);
    ui->cb_allno    ->setChecked(false);
    ui->cb_food     ->setChecked(false);
    ui->cb_song     ->setChecked(false);
    ui->cb_fun      ->setChecked(false);
    ui->cb_video    ->setChecked(false);
    ui->cb_ennegy   ->setChecked(false);
    ui->cb_outside  ->setChecked(false);
    ui->cb_dance    ->setChecked(false);
    ui->cb_edu      ->setChecked(false);
}


void LoginDia::on_pb_login_clicked()
{
    QString tel=ui->le_tel->text().trimmed();
    QString pass=ui->le_pass->text().trimmed();

    if(tel.isEmpty() || pass.isEmpty())
    {
        QMessageBox::warning(this,"警告","登陆信息不能为空");
        return;
    }

    if(tel.size()!=11)
    {
       QMessageBox::warning(this,"警告","电话号码太长或太短");
       return;
    }

    for(int i=0;i<11;++i)
    {
        if(tel[i]<'0' ||tel[i]>'9')
        {
            QMessageBox::warning(this,"警告","电话号码只能为数字");
            return;
        }
    }

    //发送登陆信息
    emit signals_sendLoginInfo(tel,pass);
}


void LoginDia::on_pb_clear_clicked()
{
    ui->le_tel->clear();
    ui->le_pass->clear();
}

void LoginDia::on_pb_pianhao_clicked()
{
    if(ui->gb_pianhao->isVisible()){
        ui->gb_pianhao->hide();
    }else{
        ui->gb_pianhao->show();
    }
}

// 辅助：统一设置所有偏好复选框
static void setAllPianhao(Ui::LoginDia *ui, bool checked)
{
    ui->cb_food     ->setChecked(checked);
    ui->cb_song     ->setChecked(checked);
    ui->cb_fun      ->setChecked(checked);
    ui->cb_video    ->setChecked(checked);
    ui->cb_ennegy   ->setChecked(checked);
    ui->cb_outside  ->setChecked(checked);
    ui->cb_dance    ->setChecked(checked);
    ui->cb_edu      ->setChecked(checked);
}

// 全选：勾选所有偏好，同时取消"全不选"
void LoginDia::on_cb_all_stateChanged(int state)
{
    if (state == Qt::Checked) {
        ui->cb_allno->blockSignals(true);
        ui->cb_allno->setChecked(false);
        ui->cb_allno->blockSignals(false);
        setAllPianhao(ui, true);
    }
}

// 全不选：取消所有偏好，同时取消"全选"
void LoginDia::on_cb_allno_stateChanged(int state)
{
    if (state == Qt::Checked) {
        ui->cb_all->blockSignals(true);
        ui->cb_all->setChecked(false);
        ui->cb_all->blockSignals(false);
        setAllPianhao(ui, false);
    }
}



