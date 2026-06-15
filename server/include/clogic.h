#ifndef CLOGIC_H
#define CLOGIC_H

#include"TCPKernel.h"

class CLogic
{
public:
    CLogic( TcpKernel* pkernel )
    {
        m_pKernel = pkernel;
        m_sql = pkernel->m_sql;
        m_tcp = pkernel->m_tcp;
    }
public:
    //设置协议映射
    void setNetPackMap();
    /************** 发送数据*********************/
    void SendData( sock_fd clientfd, char*szbuf, int nlen )
    {
        m_pKernel->SendData( clientfd ,szbuf , nlen );
    }
    /************** 网络处理 *********************/
    //注册
    void RegisterRq(sock_fd clientfd, char*szbuf, int nlen);
    //登录
    void LoginRq(sock_fd clientfd, char*szbuf, int nlen);
    //上传
    void UploadRq(sock_fd clientfd, char*szbuf, int nlen);
    //下载,推荐列表
    void DownloadRq(sock_fd clientfd, char*szbuf, int nlen);
    void GetFileList(list<FileInfo *> &fileList, int userId);
    void LiveListRq(sock_fd clientfd, char*szbuf, int nlen);
    void LiveStartRq(sock_fd clientfd, char*szbuf, int nlen);
    void LiveStopRq(sock_fd clientfd, char*szbuf, int nlen);

    //文件块上传（分块写入文件，传输完成后入库）
    void UploadFileBlockRq(sock_fd clientfd, char*szbuf, int nlen);

    /*******************************************/


private:
    TcpKernel* m_pKernel;
    CMysql * m_sql;
    Block_Epoll_Net * m_tcp;
};

#endif // CLOGIC_H
