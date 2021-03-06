const path = require('path');
const {BASE_DIR, PM2_DIR, KUNGFU_ENGINE, buildProcessLogPath} = require('__gConfig/pathConfig');
const {logger} = require('__gUtils/logUtils');
export const pm2 = require('pm2')


// process.env.PM2_HOME = PM2_DIR;

const pm2Connect = () => {
    return new Promise((resolve, reject) => {
        try{
            pm2.connect((err) => {
                if(err) {
                    process.exit(2);
                    logger.error(err);
                    pm2.disconnect();
                    reject(err);
                    return;
                }
                resolve([])
            })
        }catch(err){
            pm2.disconnect()
            logger.error(err)
            reject(err)
        }  
    })
}

const pm2List = () => {
    return new Promise((resolve, reject) => {
        pm2Connect().then(() => {
            try{
                pm2.list((err, pList) => {
                    pm2.disconnect()
                    if(err){
                        logger.error(err)
                        reject(err)
                        return;
                    }
                    resolve(pList)
                })
            }catch(err){
                pm2.disconnect()
                logger.error(err)
                reject(err)
            }
        }).catch(err => reject(err))
    })
}

const pm2Delete = (target) => {
    return new Promise((resolve, reject) => {
        pm2Connect().then(() => {
            try{
                pm2.delete(target, err => {
                    pm2.disconnect();
                    if(err) {
                        logger.error(err)
                        reject(err)
                        return;
                    }
                    resolve(true)
                })
            }catch(err){
                pm2.disconnect()
                logger.error(err)
                reject(err)
            }
        }).catch(err => reject(err))
    })
}


const dealSpaceInPath = (pathname) => {
    return eval('"' + pathname.replace(/ /g, '\\ ') + '"')
}

export const describeProcess = (name) => {
    return new Promise((resolve, reject) => {
        pm2Connect().then(() => {
            try{
                pm2.describe(name, (err, res) => {
                    pm2.disconnect();
                    if(err){
                        logger.error(err)
                        reject(err);
                        return;
                    }
                    resolve(res)
                })
            }catch(err){
                pm2.disconnect();
                logger.error(err)
                reject(err)
            }
        }).catch(err => reject(err))
    })
}

export const startProcess = async (options) => {
    options = {
        ...options,
        "cwd": path.join(KUNGFU_ENGINE, 'kfc'),
        "script": "kfc",
        "log_type": "json",
        "out_file": buildProcessLogPath(options.name),
        "err_file": buildProcessLogPath(options.name),
        "merge_logs": true,
        "logDateFormat": "YYYY-MM-DD HH:mm:ss",
        "autorestart": false,
        "max_restarts": 1,
        "watch": false,
        "force": options.force === undefined ? true : options.force,
        "exec_mode" : "fork",
        "env": {
            // "PM2_HOME": PM2_DIR,
            "KF_HOME": dealSpaceInPath(BASE_DIR),
            // "ELECTRON_RUN_AS_NODE": true,
            NODE_ENV: "production",
        }
    }

    return new Promise((resolve, reject) => {
        pm2Connect().then(() => {
            try{
                pm2.start(options, (err, apps) => { 
                    pm2.disconnect();
                    if(err) {
                        logger.error(err)
                        reject(err);
                        return;
                    };
                    resolve(apps);
                })
            }catch(err){
                pm2.disconnect();
                logger.error(err)
                reject(err)
            }
        }).catch(err => reject(err))
    })
}

//启动pageEngine
export const startPageEngine = async(force) => {
    const processName = 'page_engine'
    const pageEngines = await describeProcess(processName);
    if(pageEngines instanceof Error) return new Promise((resolve, reject) => reject(new Error(pageEngines)))
    if(!force && pageEngines.length) return new Promise(resolve => resolve(new Error('page_engine正在运行！')))
    return startProcess({
        "name": processName,
        "args": "paged --name paged",
    }).catch(err => logger.error(err))
}

//启动交易日服务
export const startCalendarEngine = async(force) => {
    const processName = 'calendar_engine'
    const calendarEngines = await describeProcess(processName);
    if(calendarEngines instanceof Error) return new Promise((resolve, reject) => reject(calendarEngines))
    if(!force && calendarEngines.length) return new Promise(resolve => resolve(new Error('calendar_engine正在运行！')))
    return startProcess({
        "name": "calendar_engine",
        "args": "calendar --name calendar",
    }).catch(err => logger.error(err))    
}

//启动md
export const startMd = (resource, processName) => {
    return startProcess({
        "name": processName,
        "args": `md_${resource}`,
    }).catch(err => logger.error(err))      
}

//启动td
export const startTd = (resource, processName) => {
    return startProcess({
        "name": processName,
        "args": `td_${resource} --name ${processName}`,
    })   
}


//启动strategy
export const startStrategy = (strategyId, strategyPath) => {
    strategyPath = dealSpaceInPath(strategyPath)
    return startProcess({
        "name": strategyId,
        "args": `strategy --name ${strategyId} --path ${strategyPath}`,
    }).catch(err => {
        logger.error('startStrategy-err', err)
    })   
}


//列出所有进程
export const listProcessStatus = () => {
    return new Promise((resolve, reject) => {
        pm2List().then(pList => {
            let processStatus = {}
            Object.freeze(pList).forEach(p => {
                const name = p.name;
                const status = p.pm2_env.status
                processStatus[name] = status
            })
            resolve(processStatus)
        }).catch(err => reject(err))
    })
}

//删除进程
export const deleteProcess = async(processName) => {
    const processDescribe = await describeProcess(processName)
    if(processDescribe instanceof Error) return new Promise((resolve, reject) => reject(processDescribe)); 
    //判断进程是否存在
    if(!processDescribe.length) return new Promise((resolve) => resolve(true))
    return pm2Delete(processName)
}


//干掉所有进程
export const killAllProcess = () => {
    return new Promise((resolve, reject) => {
        pm2List().then(list => {
            const len = list.length;
            if(!len){
                resolve([])
                return;
            }
            //要保证page, calendar最后一个退出
            
            (async() => {
                let i, len = list.length;
                try{
                    for(i = 0; i < len; i++){
                        const name = list[i].name
                        if(name === 'page_engine') continue;
                        await pm2Delete(name)
                    }
                }catch(err){
                    logger.error(err)
                }
            })()
            .then(() => pm2Delete('page_engine'))
            .then(() => resolve(true))
            .catch(err => reject(err))
        }).catch(err => reject(err))
    })
}

//干掉守护进程
export const killGodDaemon = () => {
    return new Promise((resolve, reject) => {
        pm2Connect().then(() => {
            try{
                pm2.killDaemon(err => {
                    pm2.disconnect()
                    if(err) {
                        logger.error(err)
                        reject(err)
                        return
                    }
                    resolve(true)
                })
            }catch(err){
                logger.error(err)
                pm2.disconnect()
                reject(err)
            }
        }).catch(err => reject(err))
    })
}