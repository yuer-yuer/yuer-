#include <iostream>
#include <cstdlib>
#include <string>

bool transcode(const std::string& inputFile, const std::string& outputFile) {
    // 🔥 关键：这里必须加上 -bsf:v h264_mp4toannexb
    std::string command = "ffmpeg -i " + inputFile +
            " -c:v copy -bsf:v h264_mp4toannexb"
            " -c:a copy"
            " -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "
            + outputFile;

    // 打印命令方便调试
    std::cout << "\n执行FFmpeg命令: " << command << "\n" << std::endl;

    int result = std::system(command.c_str());
    if (result == 0) {
        std::cout << "✅ Transcoding completed successfully." << std::endl;
        return true;
    } else {
        std::cerr << "❌ Transcoding failed with error code: " << result << std::endl;
        return false;
    }
}


#include <cmymd5.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <cerrno>

int main() {
    //    std::string inputFile = "/home/yuer/116.mkv";  // 即使是改后缀的也能处理
    //    std::string filename = "output.m3u8";
    //    std::string outputFile = "/home/yuer/tmp/hls/" + filename;

    std::string inputFile ="/home/yuer/116.mkv";
    //获取文件MD5
    std::string md5 =getFileMD5(inputFile);
    //创建目录
    std::string path ="/home/yuer/tmp/hls/"+md5 ;
    //创建目录，设置权限为0777 (可读写可执行)目录是要新创建以前没有需要自己代码实现创建并设置权限
    if (mkdir(path.c_str(),0777)==-1){
        if (errno ==EEXIST){
            std::cout <<"Directory already exists:"<<path.c_str()<<std::endl;
        }else {
            std::cout <<"Error creating directory:"<<strerror(errno)<<std::endl;
            return 1;
        }
    }else {
        std::cout <<"Directory created successfully:"<<path.c_str()<<std::endl;
    }
    std::string filename =md5 + "/output.m3u8";
    std::string outputFile ="/home/yuer/tmp/hls/"+md5+"/output.m3u8";
    std::cout <<"play this url=http://localhost:80/hls/"+filename <<std::endl;

    std::cout << "输出文件: " << outputFile << std::endl;

    if (transcode(inputFile, outputFile)) {
        std::cout << "Continue with the next steps." << std::endl;
        std::cout << "play this url=http://localhost:80/hls/" << filename << std::endl;
    } else {
        std::cerr << "Handle the error." << std::endl;
    }

    return 0;
}
