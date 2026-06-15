#include "recoderdialog.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    RecoderDialog w;
    w.show();
    return a.exec();
}
