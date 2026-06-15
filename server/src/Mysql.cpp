#include "Mysql.h"

int CMysql::ConnectMysql(const char *server, const char *user, const char *password, const char *database)
{
    conn = mysql_init(NULL);
    mysql_set_character_set(conn, "utf8");

    if (!mysql_real_connect(conn, server, user, password, database, 0, NULL, 0)) {
        cout << "mysql_real_connect error: " << mysql_error(conn)
             << " database=" << database << endl;
        return FALSE;
    }

    pthread_mutex_init(&m_lock, NULL);
    return TRUE;
}

int CMysql::SelectMysql(char *szSql, int nColumn, list<string> &lst)
{
    MYSQL_RES *results = NULL;

    pthread_mutex_lock(&m_lock);

    if (mysql_query(conn, szSql)) {
        cout << "mysql_query error: " << mysql_error(conn)
             << " sql=" << szSql << endl;
        pthread_mutex_unlock(&m_lock);
        return FALSE;
    }

    results = mysql_store_result(conn);
    pthread_mutex_unlock(&m_lock);

    if (NULL == results) {
        cout << "mysql_store_result error: " << mysql_error(conn)
             << " sql=" << szSql << endl;
        return FALSE;
    }

    MYSQL_ROW record;
    while ((record = mysql_fetch_row(results))) {
        for (int i = 0; i < nColumn; i++) {
            lst.push_back(record[i] ? record[i] : "");
        }
    }

    mysql_free_result(results);
    return TRUE;
}

int CMysql::UpdataMysql(char *szsql)
{
    if (!szsql) {
        return FALSE;
    }

    pthread_mutex_lock(&m_lock);

    if (mysql_query(conn, szsql)) {
        cout << "mysql_query error: " << mysql_error(conn)
             << " sql=" << szsql << endl;
        pthread_mutex_unlock(&m_lock);
        return FALSE;
    }

    pthread_mutex_unlock(&m_lock);
    return TRUE;
}

void CMysql::DisConnect()
{
    mysql_close(conn);
}
