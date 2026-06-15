#include "ckernel.h"

#include <QCoreApplication>
#include <QDebug>
#include <QFileInfo>
#include <QSettings>

#include "TcpClientMediator.h"
#include "TcpServerMediator.h"

CKernel::CKernel(QObject *parent) : QObject(parent)
  , m_tcpClient(nullptr)
{
    loadIniFile();
}

CKernel::~CKernel()
{
    closeNet();
}

bool CKernel::openNet()
{
    if (m_tcpClient && m_tcpClient->IsConnected()) {
        return true;
    }

    if (!m_tcpClient) {
        m_tcpClient = new TcpClientMediator;
    }

    connect(m_tcpClient, SIGNAL(SIG_ReadyData(uint,char*,int)),
            this, SLOT(slot_dealClientData(uint,char*,int)), Qt::UniqueConnection);

    return m_tcpClient->OpenNet(/*ip.toStdString().c_str(), port.toUShort()*/ "192.168.75.135");
}

void CKernel::closeNet()
{
    if (m_tcpClient) {
        m_tcpClient->CloseNet();
        delete m_tcpClient;
        m_tcpClient = nullptr;
    }
}

bool CKernel::sendData(char *buf, int nlen)
{
    if (!openNet()) {
        return false;
    }

    return m_tcpClient->SendData(0, buf, nlen);
}

bool CKernel::isConnected() const
{
    return m_tcpClient && m_tcpClient->IsConnected();
}

void CKernel::loadIniFile()
{
    QString path = QCoreApplication::applicationDirPath() + "/config.ini";
    QFileInfo info(path);
    if (info.exists()) {
        QSettings setting(path, QSettings::IniFormat);
        setting.beginGroup("net");
        QVariant strIP = setting.value("ip", "");
        QVariant strPort = setting.value("port", "");
        if (!strIP.toString().isEmpty()) {
            ip = strIP.toString();
        }
        if (!strPort.toString().isEmpty()) {
            port = strPort.toString();
        }
        setting.endGroup();
    } else {
        QSettings setting(path, QSettings::IniFormat);
        setting.beginGroup("net");
        setting.setValue("ip", ip);
        setting.setValue("port", port);
        setting.endGroup();
    }
    qDebug() << "ip:" << ip << "port:" << port;
}

#ifdef USE_SERVER
void CKernel::slot_dealServerData(unsigned int lSendIP, char *buf, int nlen)
{
    m_tcpServer->SendData(lSendIP, buf, nlen);
    delete[] buf;
}
#endif

void CKernel::slot_dealClientData(unsigned int lSendIP, char *buf, int nlen)
{
    Q_EMIT SIG_ReadyData(lSendIP, buf, nlen);
}
