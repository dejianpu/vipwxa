//app.js
App({
  
  onLaunch: function(options) {
    this.client.scene = parseInt(options.scene) || 1001;
    this.client.path = options.path || '';
    this.client.query = options.query || {};
    this.client.referrerInfo = options.referrerInfo || {};
    this.client.shareTicket = options.shareTicket || false;
    this.readBuy();
    this.readLocation();
  },
  parseOptions: function(options) {
    if(!options)
    {
      return({});
    }

    var opt = {};

    if(!options.scene)
    {
      return(options);
    }

    var scene = decodeURIComponent(options.scene);
    var list = scene.split('/');

    if(!list[1])
    {
      this.globalData.fromuid = options.scene;
      options.fromuid = this.globalData.fromuid;
      return(options);
    }

    for(var i = 0; i < list.length; i+=2)
    {
      opt[list[i]] = list[i+1];
    }

    if(opt['from_uid'])
    {
      this.globalData.fromuid = opt['from_uid'];
    }

    return(opt);
  },
  Login: function() {
    var that = this;

    return(new Promise((resolve, reject) => {
      // 登录
      wx.login({
        success: res => {
          if (res.code) {
            wx.showLoading({
              title: '数据获取中',
            });
            
            wx.request({
              url: that.globalData.domain + '/login?json=1&_client=wxa&wx_code=' + res.code + '&version=' + that.version + (that.globalData.fromuid ? '&from_uid=' + that.globalData.fromuid : ''), //请求地址
              header: { //请求头
                "Content-Type": "applciation/json"
              },
              method: "GET", //get为默认方法/POST
              success: res => {
                wx.hideLoading();
                that.pullDownRefreshDone();

                if (res.data.status == 'success') {
                  var session = {
                    id: res.data.session_id,
                    user_id: res.data.user_id
                  };

                  that.globalData.session = session;
                  that.globalData.gz = parseInt(res.data.gz) || 0;

                  if (res.data.user_id && that.globalData.gz && res.data.nick_name!='微信用户') {
                    that.globalData.user = {};
                    that.globalData.user.user_id = res.data.user_id;
                    that.globalData.user.nick_name = res.data.nick_name;
                    that.globalData.user.user_avatar = res.data.user_avatar;
                    that.globalData.user.user_ctime = res.data.user_ctime;
                    that.globalData.user.user_sex = res.data.user_sex;
                    that.globalData.userInfo = that.globalData.user;
                  }

                  resolve(res);
                } else {
                  var session = {
                    id: res.data.session_id,
                    user_id: 0
                  };

                  that.globalData.session = session;
                  resolve(res);
                }
              },
              fail: function(err) {
                wx.hideLoading();
                reject(res);
              }, //请求失败
              complete: function() {} //请求完成后执行的函数
            })
          }
        }
      });
    }));
  },
  getProfile: function() {
    if(this.globalData.user && this.globalData.user.nick_name != '微信用户')
    {
      return(true);
    }

    return(false);
  },
  complate: function(msg) {
    var msg = msg || '用于完善会员资料',
        that = this;
    return(new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc:msg,
        success: res => {
          that.globalData.userInfo = res.userInfo;
          that.updateFan();
          resolve(res);
        }
      });
    }));
  },
  updateFan: function() {
    var gUser = this.globalData.user,
      gInfo = this.globalData.userInfo,
      gSex = {
        '0': 'unknow',
        '1': 'man',
        '2': 'women'
      };

    if (gInfo.nickName == gUser.nick_name && gSex[gInfo.gender] == gUser.user_sex) {
      return;
    }

    var post = '';
    post += '&name=' + encodeURIComponent(gInfo.nickName);
    post += '&sex=' + encodeURIComponent(gInfo.gender);
    post += '&avatar=' + encodeURIComponent(gInfo.avatarUrl);
    post += '&country=' + encodeURIComponent(gInfo.country);
    post += '&province=' + encodeURIComponent(gInfo.province);
    post += '&city=' + encodeURIComponent(gInfo.city);
    post += '&language=' + encodeURIComponent(gInfo.language);

    wx.showLoading({
      title: '更新会员信息中',
    });

    wx.request({
      url: this.globalData.domain + '/api/fan/update_api?json=1&_client=wxa&_gz=' + this.globalData.gz + '&version=' + this.version + '&PHPSESSID=' + this.globalData.session.id, //请求地址
      header: { //请求头
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST", //get为默认方法/POST
      data: post,
      success: function(res) {
        wx.hideLoading();
      }
    });
  },
  saveBuy: function(tabbar) {
    var stat = 0,
        tabbar = tabbar || false;

    for(var i = 0; i < this.globalData.buy.length; i++)
    {
      if(this.globalData.buy[i].selected)
      {
        stat += this.globalData.buy[i].total;
      }
    }

    wx.setStorage({
      key: 'buy',
      data: this.globalData.buy
    });

    if(tabbar)
    {
      /*if(stat>0)
      {
        wx.setTabBarBadge({
          index: 2,
          text: stat.toString()
        });
      }
      else
      {
        wx.removeTabBarBadge({
          index: 2
        });
      }*/
    }
  },
  selectedBuy: function(id, selected, tabbar) {
    var stat = 0,
        id = id || 0,
        selected = selected || false,
        tabbar = tabbar || false;

    for(var i = 0; i < this.globalData.buy.length; i++)
    {
      if(this.globalData.buy[i].id == id)
      {
        stat += this.globalData.buy[i].total;
        this.globalData.buy[i].selected = selected;
      }
      else if(this.globalData.buy[i].selected)
      {
        stat += this.globalData.buy[i].total;
      }
    }

    wx.setStorage({
      key: 'buy',
      data: this.globalData.buy
    });

    if(tabbar)
    {
      /*if(stat>0)
      {
        wx.setTabBarBadge({
          index: 2,
          text: stat.toString()
        });
      }
      else
      {
        wx.removeTabBarBadge({
          index: 2
        });
      }*/
    }
  },
  readBuy: function() {
    if(this.globalData.buy && this.globalData.buy.length)
    {
      return(this.globalData.buy);
    }
    
    var that = this;

    return(new Promise((resolve, reject) => {
      wx.getStorage({
        key: 'buy',
        success(res) {
          that.globalData.buy = res.data;
          var stat = 0;

          for(var i = 0; i < res.data.length; i++)
          {
            if(res.data[i].selected)
            {
              stat += res.data[i].total;
            }
          }

          that.globalData.shopCount = stat;
          resolve(res.data);
        }
      });
    })).catch((e) => {});
  },
  clearBuy: function(tabbar) {
    var tabbar = tabbar || false;
    this.globalData.buy = [];
    
    wx.setStorage({
      key: 'buy',
      data: []
    });

    if(tabbar)
    {
      wx.removeTabBarBadge({
        index: 2
      });
    }
  },
  addBuy: function(id, total, append, tabbar) {
    var id = id || false,
        total = parseInt(total) || 0,
        append = append || false,
        tabbar = tabbar || true,
        stat = 0,
        matched = false;

    if(!id)
    {
      return;
    }

    var buy = [];

    for(var i = 0; i < this.globalData.buy.length; i++)
    {
      if(this.globalData.buy[i].id == id)
      {
        if(append)
        {
          this.globalData.buy[i].total += total;
        }
        else
        {
          this.globalData.buy[i].total = total;
        }

        stat += this.globalData.buy[i].total;
        matched = true;
      }
      else if(this.globalData.buy[i].selected)
      {
        stat += this.globalData.buy[i].total;
      }

      if(this.globalData.buy[i].total <= 0)
      {
        continue;
      }

      buy.push(this.globalData.buy[i]);
    }

    if(!matched)
    {
      buy.push({'id':id, 'total':total,'selected':true});
      stat += total;
    }

    this.globalData.buy = buy;
    this.globalData.shopCount = stat;
    this.saveBuy();
    return(total);
  },
  saveLocation: function(address) {
    wx.setStorage({
      key: 'location',
      data: [address.city, address.address, address.deliver]
    });

    this.globalData.city = address.city;
    this.globalData.address = address.address;
    this.globalData.deliver = address.deliver;
  },
  readLocation: function() {
    var that = this;

    wx.getStorage({
      key: 'location',
      success(res) {
        that.globalData.city = res.data[0];
        that.globalData.address = res.data[1];
        that.globalData.deliver = res.data[2];
      }
    });
  },
  chooseDeliver:function(deliver) {
    this.globalData.deliver = deliver.id;
    this.saveLocation(this.globalData);
  },
  saveSearch: function(words) {
    wx.setStorage({
      key: 'search',
      data: words
    });
  },
  readSearch: function() {
    return(new Promise((resolve, reject) => {
      wx.getStorage({
        key: 'search',
        success(res) {
          resolve(res);
        }
      });
    }));
  },
  checkLocation: function() {
    var that = this;

    return(new Promise((resolve, reject) => {
      wx.showLoading({
        title: '获取定位中',
      });

      wx.getLocation({
        type: 'wgs84',
        success (res) {
          wx.request({
            url: that.globalData.domain + '/json/location.json?_client=wxa&_gz=' + that.globalData.gz + '&version=' + that.version + '&type=wgs84&lat=' + res.latitude + '&lng=' + res.longitude + '&PHPSESSID=' + that.globalData.session.id, //请求地址
            method: "GET",
            success: function(res) {
              wx.hideLoading();
              resolve(res);
            },
            fail: function(res) {
              wx.hideLoading();
              resolve(res);
            }
          });
        },
        fail(res) {
          wx.hideLoading();
          resolve(res);
        }
      })
    }));
  },
  loadCity: function() {
    var that = this;

    return(new Promise((resolve, reject) => {
      if(that.globalData.provinceList && that.globalData.provinceList.length && that.globalData.mapkey)
      {
        resolve({'provinceList': that.globalData.provinceList,'cityList': that.globalData.cityList,'areaList': that.globalData.areaList, 'mapkey':that.globalData.mapkey});
        return(true);
      }

      wx.showLoading({
        title: '获取城市数据中',
      });

      wx.getStorage({
        key: 'city',
        success(res) {
          if(res.data[0])
          {
            wx.hideLoading();
            that.globalData.provinceList = res.data[0];
            that.globalData.cityList = res.data[1];
            that.globalData.areaList = res.data[2];
            that.globalData.mapkey = res.data[3];
            resolve({'provinceList': that.globalData.provinceList,'cityList': that.globalData.cityList,'areaList': that.globalData.areaList,'mapkey': that.globalData.mapkey});
          }
          else
          {
            wx.request({
              url: that.globalData.domain + '/json/city.json?json=1&_client=wxa&_gz=' + that.globalData.gz + '&version=' + that.version + '&version=' + that.version + '&PHPSESSID=' + that.globalData.session.id, //请求地址
              method: "GET",
              success: function(res) {
                wx.hideLoading();
                that.saveCity(res.data);
                resolve({'provinceList': that.globalData.provinceList,'cityList': that.globalData.cityList,'areaList': that.globalData.areaList,'mapkey': that.globalData.mapkey});
              },
              fail: function(res) {
                wx.hideLoading();
                reject(res);
              }
            });
          }
        },
        fail(res) {
          wx.request({
            url: that.globalData.domain + '/json/city.json?json=1&_client=wxa&_gz=' + that.globalData.gz + '&version=' + that.version + '&PHPSESSID=' + that.globalData.session.id, //请求地址
            method: "GET",
            success: function(res) {
              wx.hideLoading();
              that.saveCity(res.data);
              resolve({'provinceList': that.globalData.provinceList,'cityList': that.globalData.cityList,'areaList': that.globalData.areaList,'mapkey': that.globalData.mapkey});
            },
            fail: function(res) {
              wx.hideLoading();
              reject(res);
            }
          });
        }
      });
    }));
  },
  saveCity: function(data) {
    wx.setStorage({
      key: 'city',
      data: [data.provinceList, data.cityList, data.areaList, data.mapkey]
    });

    this.globalData.provinceList = data.provinceList;
    this.globalData.cityList = data.cityList;
    this.globalData.areaList = data.areaList;
    this.globalData.mapkey = data.mapkey;
  },
  complate: function(msg) {
    var msg = msg || '用于完善会员资料',
        that = this;
    return(new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc:msg,
        success: res => {
          that.globalData.userInfo = res.userInfo;
          that.updateFan();
          resolve(res);
        }
      });
    }));
  },
  loginCheck:function(options) {
    var that = this,
        options = this.parseOptions(options);

    return new Promise((resolve, reject) => {
      that.globalData.fromuid = options.fromuid || 0;

      if (!that.globalData.session) {
        that.Login().then(res => {
          if(!that.globalData.city)
          {
            that.checkLocation().then(res => {
              that.saveLocation(res.data);
              resolve();
            });
          }
          else
          {
            resolve();
          }
        });
      }
      else {
        if(!that.globalData.city)
        {
          that.checkLocation().then(res => {
            resolve();
          });
        }
        else
        {
          resolve();
        }
      }
    });
  },
  request: function(url, post, msg) {
    var url = url || '',
      post = post || '';

    if (!url) {
      return(new Promise((resolve, reject) => {
        reject('no url');
      }));
    }

    if(this.globalData.show_tips)
    {
      wx.showLoading({
        title: this.globalData.tips
      });
    }

    url = this.globalData.domain + url + (url.indexOf('?') == -1 ? '?' : '&') + 'json=1&_client=wxa&_gz=' + this.globalData.gz + '&_city=' + this.globalData.city + '&_deliver=' + this.globalData.deliver + '&version=' + this.version + '&PHPSESSID=' + this.globalData.session.id;

    post = this.buildPost(post);

    this.globalData.request = {
      'url': url,
      'post': post
    };

    return(new Promise((resolve, reject) => {
      this.requestData(resolve, reject);
    }));
  },
  buildPost: function(post, pkey) {
    var post = post || false,
        pkey = pkey || false;

    if(!post)
    {
      return('');
    }

    if(typeof post != 'object')
    {
      return(pkey ? pkey + '=' + post : post);
    }

    var _post = [];

    for(var key in post)
    {
      var _key = pkey ? pkey + '[' + key + ']' : key;

      if(typeof post[key] != 'object')
      {
        _post.push(_key + '=' + encodeURIComponent(post[key]));
      }
      else
      {
        var str = this.buildPost(post[key], _key);

        if(str)
        {
          _post.push(str);
        }
      }
    }

    return(_post.join('&'));
  },
  requestData: function(resolve, reject) {
    var post = this.globalData.request.post,
      url = this.globalData.request.url,
      that = this;

    if (post.length > 0) {
      wx.request({
        url: url, //请求地址
        header: { //请求头
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST", //get为默认方法/POST
        data: post,
        success: res => {
          if(that.globalData.show_tips)
          {
            wx.hideLoading();
          }

          if (!res || res.data.doLogin) {
            if(that.loginTry <= 3)
            {
              that.loginTry++;

              that.Login().then((res) => {
                that.requestData(resolve, reject);
              });
            }
            else
            {
              that.loginTry = 0;
            }
          } else {
            that.loginTry = 0;
            that.globalData.show_tips = true;

            if(res.data.navigation)
            {
              that.setNavigation(res.data.navigation);
            }

            resolve(res.data);
          }
        }
      });
    } else {
      wx.request({
        url: url, //请求地址
        header: {
          "Content-Type": "application/json"
        },
        method: "GET", //get为默认方法/POST
        success: function(res) {
          if(that.globalData.show_tips)
          {
            wx.hideLoading();
          }

          if (!res || res.data.doLogin) {
            if(that.loginTry <= 3)
            {
              that.loginTry++;
              that.callback = that.requestData;
              that.Login().then((res) => {
                that.requestData(resolve, reject);
              });
            }
            else
            {
              that.loginTry = 0;
            }
          } else {
            that.loginTry = 0;
            that.globalData.show_tips = true;

            if(res.data.navigation)
            {
              that.setNavigation(res.data.navigation);
            }

            resolve(res.data);
          }
        }
      });
    }
  },
  upload: function(url, file, field, post) {
    var url = url || '',
        field = field || 'file',
        file = file || '',
        post = post || false;

    if (!url || !file) {
      return;
    }

    wx.showLoading({
      title: '数据上传中',
    });

    if (url.indexOf('?') == -1) {
      url = this.globalData.domain + url + '?json=1&_client=wxa&_city=' + this.globalData.city + '&PHPSESSID=' + this.globalData.session.id;
    } else {
      url = this.globalData.domain + url + '&json=1&_client=wxa&_city=' + this.globalData.city + '&PHPSESSID=' + this.globalData.session.id;
    }

    this.globalData.upload = {
      'filePath': file,
      'name': field,
      'url': url
    };

    if(post)
    {
      this.globalData.upload['formData'] = post;
    }

    return(new Promise((resolve, reject) => {
      this.uploadData(resolve, reject);
    }));
  },
  uploadData: function(resolve, reject) {
    var that = this;
    var upload = this.globalData.upload;

    upload['success'] = function(res) {
      wx.hideLoading();
      var json = false;

      if(res && res.data)
      {
        json = JSON.parse(res.data);
      }

      if (!json || json.doLogin) {
        that.Login().then((res) => {
          that.uploadData(resolve, reject);
        });
      } else {
        resolve(json);
      }
    };

    upload['fail'] = function(res) {
      wx.hideLoading();
      resolve(res);
    };
    
    wx.uploadFile(upload);
  },
  saveRequestMessage: function(notify, json) {
    var post = {};
    post['code'] = notify.code;
    post['act'] = notify.act;
    var k = 0;

    for(var key in json)
    {
      if(key == 'errMsg')
      {
        continue;
      }

      if(json[key] == 'accept')
      {
        post['msg[' + k + ']'] = key;
        k++;
      }
    }

    if(k <= 0)
    {
      return(new Promise((resolve, reject) => {
        resolve({'status':'faild','error':['没有任何订阅项目']});
      }));
    }

    return(new Promise((resolve, reject) => {
      this.request('/user/notify/add_user', post).then((res) => {
        resolve(res);
      });
    }));
  },
  showSuccess: function(msg) {
    if(this.dialog)
    {
      this.dialog.success(msg);
    }
    else
    {
      wx.showModal({
        title: '更新成功',
        content: msg,
        showCancel:false
      });
    }
  },
  showError: function(json) {
    var msg = '';
    
    if(json.error && json.error.length) {
     msg = json.error.join("\n"); 
    } else if(json.msg && json.msg.length) {
      msg = json.msg.join("\n");
    } else {
      msg = '未知错误';
    }

    if(this.dialog)
    {
      this.dialog.error(msg);
    }
    else
    {
      wx.showModal({
        title: '出错了',
        content: msg,
        showCancel:false
      });
    }
  },
  setNavigation:function(nav) {

    if(!nav)
    {
      return;
    }

    if(nav.title)
    {
      wx.setNavigationBarTitle({
        title: nav.title
      });
    }
    
    if(nav.color)
    {
      wx.setNavigationBarColor(nav.color);
    }
  },
  pullDownRefresh: function() {
    this.globalData.refresh = true;
  },
  pullDownRefreshDone: function() {
    wx.hideNavigationBarLoading();
    wx.stopPullDownRefresh();
    this.globalData.refresh = false;
  },
  shareDone: function(type, url) {
    var url = url || false,
        type = type || false;

    if(!url)
    {
      return;
    }

    this.request('/dll/?a=share&type=' + type + '&url=' + encodeURIComponent(url));
  },
  addToFavorite: function(url) {
    var url = url || false;

    if(!url)
    {
      return;
    }

    this.request('/dll/?a=favorite&url=' + encodeURIComponent(url));
  },
  checkCopyright: function() {
    return(this.copyright);
  },
  loadedCopyright: function() {
    this.copyright = true;
  },
  globalData:{
    userInfo: null,
    gz:0,
    refresh: false,
    args: {},
    session: false,
    deliver: false,
    refund: false,
    account: false,
    ticket: false,
    ticket_name: '',
    ticket_status: false,
    refresh:false,
    show_tips: true,
    tips:'数据获取中',
    provinceList: [],
    cityList: [],
    areaList: [],
    mapkey:'',
    buy: [],
    site: {'id':0,'name':''},
    args:{},
    selectedIndex:0,
    shopCount: 0,
    domain: 'https://shangchao.dejianpu.cn',
    count: 0,
    city: 0,
    address: ''
  },
  client: {
    path: '',
    query: {},
    scene:1001,
    referrerInfo: {},
    shareTicket: false
  },
  dialog:false,
  copyright:false,
  loginTry:0,
  version:'1.0.0'
})
