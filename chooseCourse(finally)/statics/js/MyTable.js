// 表格组件
function MyTable(paramObj) {
    // 挂载盒子
    this.elBox = document.querySelector(paramObj.el);
    // 得到colsName
    this.colsName = paramObj.colsName;
    // 得到store
    this.store = paramObj.store;

    // 创建表格
    this.table = document.createElement('table');
    this.table.className = "table table-striped";
    this.elBox.appendChild(this.table);
}
MyTable.prototype.render = function () {
    // 清空表格（为了筛选之后调用render方便）
    this.table.innerHTML = '';

    // 创建表头
    var tr = document.createElement('tr');
    this.table.appendChild(tr);
    // 循环语句创建表头中的th
    for (var i = 0; i < this.colsName.length; i++) {
        var th = document.createElement('th');
        th.innerText = this.colsName[i].c;
        tr.appendChild(th);
    }

    var dataArr = this.store.getState().dataArr;
    // 遍历dataArr
    for (var i = 0; i < dataArr.length; i++) {
        var o = dataArr[i];

        // 创建行
        var tr = document.createElement('tr');
        this.table.appendChild(tr);

        // 要根据colsName那个数组的顺序，创建出td
        for (var j = 0; j < this.colsName.length; j++) {
            var td = document.createElement('td');
            // 判断colsName这项有没有render属性，如果有，就渲染render定义的
            if (this.colsName[j].hasOwnProperty('render')) {
                // render是个函数
                var renderFunction = this.colsName[j]['render'];
                // 这里相当于每遍历一个数据条目，就调用一下render函数，并且调用的时候还传入当前数据条目o
                td.innerHTML = renderFunction(o);
            } else {
                td.innerText = o[this.colsName[j].e];
            }
            tr.appendChild(td);
        }
    }
};