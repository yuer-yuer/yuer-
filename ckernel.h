#ifndef CKERNEL_H
#define CKERNEL_H

#include <QObject>
#include <INetMediator.h>
#include "packdef.h"
//#define USE_SERVER
class CKernel : public QObject
{
    Q_OBJECT
private:
    explicit CKernel(QObject *parent = nullptr);
    explicit CKernel(const CKernel& kernel){}
    ~CKernel();
    INetMediator *m_tcpClient;
#ifdef USE_SERVER
    INetMediator *m_tcpServer;
#endif
public:
    static CKernel* GetInstance(){
        static CKernel kernel;
        return &kernel;
    }

    void loadIniFile();
    bool openNet();
    void closeNet();
    bool sendData(char* buf, int nlen);
    bool isConnected() const;
private:
    QString ip="192.168.75.101";
    QString port="8080";
signals:
    void SIG_ReadyData(unsigned int lSendIP, char* buf, int nlen);

private slots:
    //void slot_dealServerData(unsigned int lSendIP , char* buf , int nlen );
    void slot_dealClientData(unsigned int lSendIP , char* buf , int nlen );
};

#endif // CKERNEL_H
