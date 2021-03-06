import * as pathToRegexp from 'path-to-regexp';
import Uma, { TMethodInfo } from '@umajs/core';

import { TPathInfo } from './types/TPathInfo';
import router, { StaticRouterMap, RegexpRouterMap, ClazzMap } from './router';
import { replaceTailSlash } from './helper';

export const Router = () => {
    console.log('======Init router start======');

    const ALLROUTE: string[] = [];

    // delete cache for reload
    RegexpRouterMap.clear();
    StaticRouterMap.clear();

    // go through contollerInfo，and init each router map
    for (const controllerInfo of Uma.controllersInfo) {
        const { name: clazzName, path: rootPath = '', clazz } = controllerInfo;
        const methodMap: Map<string, TMethodInfo> = controllerInfo.methodMap || new Map();

        const decoratorMethodNameArr: string[] = [...methodMap.values()].map((m) => m.name);
        const methodNameArr: (string | number | symbol)[] = Reflect.ownKeys(clazz.prototype)
            .filter((name) => name !== 'constructor'
            && !decoratorMethodNameArr.includes(String(name))
            && typeof clazz.prototype[`${String(name)}`] === 'function');

        // 记录没有被修饰过的路由 默认路由 controller/method
        methodNameArr.forEach((methodName) => {
            ALLROUTE.push(`/${clazzName}/${String(methodName)}`);
        });

        // 主要是对被@Path修饰过的路由进行处理
        for (const [methodName, methodInfo] of methodMap) {
            const { paths } = methodInfo;
            const pathInfo: TPathInfo = { methodName, ...controllerInfo };

            paths.forEach(({ path: p, methodTypes }) => {
                if (!p) return;

                // 路由访问地址为class中的Path修饰地址 + method的Path修饰地址
                const routePath = replaceTailSlash(rootPath + p) || '/';

                if (!ALLROUTE.includes(String(routePath))) {
                    console.log(`[${methodTypes ? methodTypes.join() : 'ALL'}]:${routePath} ==> ${clazzName}.${methodName}`);
                    ALLROUTE.push(routePath);
                } else {
                    // 注册路由重复
                    console.error(`${routePath} ==> ${clazzName}.${methodName} has been registered.
                    Recommended use the Path decorator to annotate the ${clazzName}.controller.ts`);

                    return;
                }

                // 如果method设置的Path中有:/(被认定为正则匹配路由，否则为静态路由
                if (p.indexOf(':') > -1 || p.indexOf('(') > -1) {
                    const keys: pathToRegexp.Key[] = [];
                    const pathReg = pathToRegexp(routePath, keys);

                    RegexpRouterMap.set(pathReg, { ...pathInfo, keys, routePath, methodTypes });
                } else {
                    StaticRouterMap.set(routePath, { ...pathInfo, methodTypes });
                }
            });
        }

        // 保存所有的clazz信息到ClazzMap中
        ClazzMap.set(clazzName, controllerInfo);
    }

    console.log('======Init router end======');

    const uma = Uma.instance();

    if (uma && uma instanceof Uma) {
        uma.routers = ALLROUTE;
    }

    return router;
};
