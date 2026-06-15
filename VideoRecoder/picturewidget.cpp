#include "picturewidget.h"
#include "ui_picturewidget.h"

PictureWidget::PictureWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::PictureWidget)
{
    ui->setupUi(this);
    //FramelessWindowHint//无边框  //WindowStaysOnTopHint一直在最上面不会被覆盖；
    this->setWindowFlags(Qt::FramelessWindowHint|Qt::WindowStaysOnTopHint);
}

PictureWidget::~PictureWidget()
{
    delete ui;
}

void PictureWidget::slot_setImage(QImage img)
{
    QPixmap pixmap;
    if(!img.isNull()){
        pixmap=QPixmap::fromImage(img.scaled(ui->lb_show->size(),Qt::KeepAspectRatio));

    }else{
        pixmap=QPixmap::fromImage(img);
    }
    ui->lb_show->setPixmap(pixmap);
}
