create table if not exists t_LiveInfo (
    liveid bigint unsigned not null auto_increment,
    userId bigint unsigned default null,
    title varchar(300) default null,
    coverPath varchar(300) default null,
    rtmp varchar(300) default null,
    status int default 1,
    startTime datetime default null,
    endTime datetime default null,
    primary key (liveid),
    key idx_live_status_start (status, startTime),
    key idx_live_user_status (userId, status)
);
