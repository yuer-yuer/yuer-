#ifndef _TCPKERNEL_H
#define _TCPKERNEL_H

#include "block_epoll_net.h"
#include "Mysql.h"

typedef int sock_fd;

#define NetPackMap(a)  TcpKernel::GetInstance()->m_NetPackMap[a - _DEF_PACK_BASE]

class CLogic;
typedef void (CLogic::*PFUN)(sock_fd, char*, int nlen);

class TcpKernel
{
public:
    static TcpKernel* GetInstance();

    int Open(int port);
    void initRand();
    void setNetPackMap();
    void Close();
    static void DealData(sock_fd clientfd, char* szbuf, int nlen);
    void EventLoop();
    void SendData(sock_fd clientfd, char* szbuf, int nlen);
    void ClearUserByFd(sock_fd clientfd);

private:
    TcpKernel();
    ~TcpKernel();

    CMysql *m_sql;
    Block_Epoll_Net *m_tcp;
    PFUN m_NetPackMap[_DEF_PACK_COUNT];
    map<int, int> m_mapIDToUserFD;
    map<int, FileInfo*> m_mapFileIDToFileInfo;

    CLogic *m_logic;
    friend class CLogic;
};

#endif
