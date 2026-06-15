TEMPLATE = app
CONFIG += console c++11
CONFIG -= app_bundle
CONFIG -= qt

SOURCES += \
        cmymd5.cpp \
        main.cpp

HEADERS += \
    CMyMD5.h \
    CMyMD5.h \
    cmymd5.h

LIBS +=-lcryptopp

