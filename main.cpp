#include "playerdialog.h"
#include "videoplayer.h"
#include <QApplication>
#undef main
int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    //这里简单的输出一个版本号
     cout << "Hello FFmpeg!" << endl;
     av_register_all();
     unsigned version = avcodec_version();
     cout << "version is:" << version<<endl;

    PlayerDialog w;
    w.show();
    return a.exec();
}
