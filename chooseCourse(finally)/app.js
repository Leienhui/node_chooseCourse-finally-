var express = require('express');
var mysql = require('mysql');
var formidable = require('formidable');
var xlsx = require('node-xlsx');
var fs = require('fs');
var crypto = require('crypto');
var url = require('url');
var session = require('express-session');

// 创建一个app
var app = express();

// session的设置，从官网复制过来的
// 手册地址：https://www.expressjs.com.cn/en/resources/middleware/session.html
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

// 连接
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'xkxtdb'
});

// 链接数据库
connection.connect();

// 看门人机制，中间件
app.get('/xuanke.html', function (req, res, next) {
    // 如果用户没有登陆，那么就重定向到login.html去
    if (!req.session.login) {
        res.redirect('/login.html');
    } else {
        // 放行，就会执行后面的代码
        next();
    }
});

// 静态化statics文件夹。use表示使用插件。
// 使用什么插件呢？就是使用内置的static函数，字符串表示需要静态化的文件夹的名字
// 什么是静态化呢?就是这个文件夹中的内容将自动拥有路由。
app.use(express.static('statics'));

// 当用户用GET请求访问/的时候
app.get('/', function (req, res) {
    // 如果用户没有登陆，那么就重定向到login.html去
    if (!req.session.login) {
        res.redirect('/login.html');
    } else {
        // 如果用户登陆了，那么就重定向到xuanke.html去
        res.redirect('/xuanke.html');
    }
});

// 当用户用GET请求访问/ke的时候，查询数据库显示所有课
app.get('/ke', function (req, res) {
    // 进行查询，这里的SELECT语句就是SQL语句
    connection.query('SELECT * FROM ke', function (error, results, fields) {
        // 把数据显示在网页上，不是res.send()而是res.json()
        res.json(results);
    });

});

// 当用户用GET请求访问/news的时候
app.get('/news', function (req, res) {
    // 显示文字
    res.send('我是新闻栏目');
});

// 当用户用post请求访问/uploadke的时候
app.post('/uploadke', function (req, res) {
    // 这句话表示要用formidable处理上传文件
    var form = formidable({
        // 允许文件多段传输
        multiples: true,
        // 上传到哪个文件夹
        uploadDir: 'uploads',
        // 保留扩展名
        keepExtensions: true
    });

    form.parse(req, function (err, fields, files) {
        // 得到上传文件的文件名，前面的uploads//不要
        // 这个文件名是系统随机改的名
        var filename = files.file.path.slice(8);

        // 分析处理Excel表的数据
        var data = xlsx.parse(fs.readFileSync('./uploads/' + filename));

        // 数据存储在[0]中，是Excel表格的第0号表（sheet）的意思
        // console.log(data[0].data);

        // 执行数据库插入语句，我们要插入多条数据，语法是这样的
        // INSERT INTO ke (mingzi,jianjie,laoshi,nianjixianzhi,xingqiji,leixing) VALUES ('英语电影欣赏','很好很好很好很好很好很好','王强','123', '2', '外语'),('世界历史', '很好很好很好很好很好很好', '李扒', '34', '2', ' 人文'),('AAAAAA', '很好很好很好很好很好很好', '李扒', '34', '2', ' 人文'),('BBBB', '很好很好很好很好很好很好', '李扒', '34', '2', ' 人文'),('CCCCCC', '很好很好很好很好很好很好', '李扒', '34', '2', ' 人文')

        // 基础sql，一会儿用循环语句拼接后面
        var sql = "INSERT INTO ke (mingzi,jianjie,laoshi,nianjixianzhi,xingqiji,leixing,renshuxianzhi) VALUES "

        // 拼接SQL语句，从下标为1的行开始遍历（因为下标为0的行是标题行）
        for (var i = 1; i < data[0].data.length; i++) {
            if (i != 1) {
                // 每个课之间SQL语句是逗号分隔的
                sql += ',';
            }
            // 每个条目都用圆括号包裹起来的
            sql += "('" + data[0].data[i][0] + "',"
            sql += "'" + data[0].data[i][1] + "',"
            sql += "'" + data[0].data[i][2] + "',"
            sql += "'" + data[0].data[i][3] + "',"
            sql += "'" + data[0].data[i][4] + "',"
            sql += "'" + data[0].data[i][5] + "',"
            sql += "" + data[0].data[i][6] + ")"
        }

        // 先删除表中所有数据
        connection.query('TRUNCATE TABLE ke', function () {
            // 执行插入数据的SQL语句
            connection.query(sql, function (error, results, fields) {
                // 显示结果！！
                res.send('<h1>成功导入' + (data[0].data.length - 1) + '条数据</h1>')
            });
        });
    });
});

// 处理用户登陆
app.post('/login', function (req, res) {
    // 处理post请求，需要使用formidable
    var form = formidable({
    });

    form.parse(req, (err, fields, files) => {
        // fields中存储的就是表单对象
        // 加密用户的密码
        var hash = crypto.createHash('SHA256');
        var jiamihou = hash.update(fields.password).digest('hex');

        // 寻找数据库中有没有id和密码都匹配的
        var sql = "SELECT * FROM student WHERE id = " + Number(fields.xuehao) + " AND password = '" + jiamihou + "'";

        connection.query(sql, function (error, results, fields) {
            // 判断results数组是不是空，如果是空就是用户名或密码错误，如果不是空，就是不是错误。
            if (results.length == 0) {
                res.send('-1');
            } else {
                // 登陆成功，就要发session
                req.session.login = true;
                // 可以把这个用户的所有信息都存道session中
                req.session.info = results[0];
                res.send('1');
            }
        });
    });
});

// 写一个测试接口，看看session的login值是否是true
app.get('/ceshi', function (req, res) {
    if (req.session.login) {
        res.send('登陆了');
    } else {
        res.send('没有登陆');
    }
});

// 得到登陆用户的信息
app.get('/user', function (req, res) {
    if (!req.session.login) {
        // 如果用户没有登陆
        res.json({});
    } else {
        // 如果用户登陆了
        var sql = 'SELECT * FROM student WHERE id =' + req.session.info.id;
        connection.query(sql, function (err, results) {
            res.json(results[0]);
        });
    }
});

// 退出登陆
app.get('/logout', function (req, res) {
    // 去掉session
    req.session.login = false;
    req.session.info = null;
    // 跳转
    res.redirect('/login.html');
});

// 报名接口
app.get('/baoming', function (req, res) {
    // 得到get请求的课程id
    // query表示查询，就是？部分。
    // true参数就表示将查询部分变为对象{'id': 123}
    var kechengid = url.parse(req.url, true).query.id;
    var xueshengid = req.session.info.id;

    console.log('[提示]' + xueshengid + '要报' + kechengid);

    // 查询课程数据库，看看剩余人数
    var sql = "SELECT * FROM ke WHERE id = " + kechengid;

    connection.query(sql, function (error, results, fields) {
        // 数据库中如果没有人报名，就是null，变为0
        var yibaorenshu = results[0].yibaorenshu || 0;
        console.log('[提示]该课程已经报名的人数是', yibaorenshu);
        console.log('[提示]该课程人数限制是', results[0].renshuxianzhi);
        if (yibaorenshu < results[0].renshuxianzhi) {
            // 只有小于人数限制，然后看年级
            var xueshengnianji = req.session.info.nianji;
            var nianjixianzhi = results[0].nianjixianzhi;
            console.log('[结论]符合人数，下面检查年级是否符合要求');
            console.log('[提示]这个学生的年级是', xueshengnianji);
            console.log('[提示]这个课程可以报名的年级是', nianjixianzhi);
            if (
                xueshengnianji == '大一' && nianjixianzhi.includes('1')
                ||
                xueshengnianji == '大二' && nianjixianzhi.includes('2')
                ||
                xueshengnianji == '大三' && nianjixianzhi.includes('3')
                ||
                xueshengnianji == '大四' && nianjixianzhi.includes('4')
            ) {
                console.log('[结论]年级符合，下面检查星期是否冲突');
                var xingqiji = results[0].xingqiji;
                console.log('[提示]该课程的星期是', xingqiji);
                // 进行学生的数据库检索
                var sql2 = 'SELECT * FROM student WHERE id = ' + xueshengid;
                connection.query(sql2, function (err, result2) {

                    // 学生已经报名的课程
                    var xuanke1 = result2[0].xuanke1;
                    var xuanke2 = result2[0].xuanke2;
                    console.log('[提示]学生已经选课1是', xuanke1);
                    console.log('[提示]学生已经选课2是', xuanke2);
                    if (
                        (xingqiji == 2 && (xuanke1 == null || !xuanke1.includes('周二')) && (xuanke2 == null || !xuanke2.includes('周二')))
                        ||
                        (xingqiji == 3 && (xuanke1 == null || !xuanke1.includes('周三')) && (xuanke2 == null || !xuanke2.includes('周三')))
                        ||
                        (xingqiji == 4 && (xuanke1 == null || !xuanke1.includes('周四')) && (xuanke2 == null || !xuanke2.includes('周四')))
                    ) {
                        console.log('[提示]星期符合，下面检查它是否已经报了两个课程了，并且写');
                        if (xingqiji == 2) {
                            var xingqiji_chinese = '周二';
                        } else if (xingqiji == 3) {
                            var xingqiji_chinese = '周三';
                        } else if (xingqiji == 4) {
                            var xingqiji_chinese = '周四';
                        }
                        if (xuanke1 == null) {
                            // 把这个课写到选课1中
                            var sql3 = 'UPDATE student SET xuanke1 = "' + results[0].mingzi + '（' + xingqiji_chinese + '）"' + ' WHERE id = ' + xueshengid;
                            connection.query(sql3, function (err, results) {
                                console.log('[结论]报名成功！已经添加到' + xueshengid + '的xuanke1字段');
                                res.send('1');
                            });
                        } else if (xuanke2 == null) {
                            // 把这个课写到选课2中
                            var sql3 = 'UPDATE student SET xuanke2 = "' + results[0].mingzi + '（' + xingqiji_chinese + '）"' + ' WHERE id = ' + xueshengid;
                            connection.query(sql3, function (err, results) {
                                console.log('[结论]报名成功！已经添加到' + xueshengid + '的xuanke2字段');
                                res.send('1');
                            });
                        } else {
                            // 它没有课的坑位了，没人限制报名2个课程，就是说它已经报了2个课程了
                            res.send('-4');
                        }
                    } else {
                        console.log('[提示]星期冲突')
                        res.send('-3');
                    }
                });
            } else {
                console.log('[结论]年级不符合');
                res.send('-2');
            }
        } else {
            console.log('[结论]已经没有剩余人数名额了');
            // 向前端发出-1代码
            res.send('-1');
        }
    });
});

// 监听3000端口
app.listen(3000);