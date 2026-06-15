QT       += core gui
QT       += multimedia

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

CONFIG += c++11

# You can make your code fail to compile if it uses deprecated APIs.
# In order to do so, uncomment the following line.
#DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0x060000    # disables all the APIs deprecated before Qt 6.0.0

INCLUDEPATH += $$PWD/ffmpeg-4.2.2/include\
             $$PWD/SDL2-2.0.10/include\
             $$PWD/VideoRecoder\
             $$PWD/VideoRecoder/opencv-release/include/opencv2\
             $$PWD/VideoRecoder/opencv-release/include
LIBS += $$PWD/ffmpeg-4.2.2/lib/avcodec.lib\
         $$PWD/ffmpeg-4.2.2/lib/avdevice.lib\
         $$PWD/ffmpeg-4.2.2/lib/avfilter.lib\
         $$PWD/ffmpeg-4.2.2/lib/avformat.lib\
         $$PWD/ffmpeg-4.2.2/lib/avutil.lib\
         $$PWD/ffmpeg-4.2.2/lib/postproc.lib\
         $$PWD/ffmpeg-4.2.2/lib/swresample.lib\
         $$PWD/ffmpeg-4.2.2/lib/swscale.lib\
         $$PWD/SDL2-2.0.10/lib/x86/SDL2.lib\
         $$PWD/VideoRecoder/opencv-release/lib/libopencv_*.dll.a

SOURCES += \
    PacketQueue.cpp \
    VideoRecoder/audio_read.cpp \
    VideoRecoder/picinpic_read.cpp \
    VideoRecoder/picturewidget.cpp \
    VideoRecoder/recoderdialog.cpp \
    VideoRecoder/savevideofilethread.cpp \
    ckernel.cpp \
    livedialog.cpp \
    logindia.cpp \
    main.cpp \
    onlinedialog.cpp \
    playerdialog.cpp \
    uploaddialog.cpp \
    videocoverwidget.cpp \
    videoplayer.cpp

HEADERS += \
    PacketQueue.h \
    VideoRecoder/audio_read.h \
    VideoRecoder/commen.h \
    VideoRecoder/picinpic_read.h \
    VideoRecoder/picturewidget.h \
    VideoRecoder/recoderdialog.h \
    VideoRecoder/savevideofilethread.h \
    ckernel.h \
    livedialog.h \
    logindia.h \
    onlinedialog.h \
    playerdialog.h \
    uploaddialog.h \
    videocoverwidget.h \
    videoplayer.h

FORMS += \
    VideoRecoder/picturewidget.ui \
    VideoRecoder/recoderdialog.ui \
    logindia.ui \
    onlinedialog.ui \
    playerdialog.ui \
    uploaddialog.ui

include(./opengl/opengl.pri)
INCLUDEPATH +=./opengl/

include(./netapi/netapi.pri)

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target

RESOURCES += \
    res.qrc
