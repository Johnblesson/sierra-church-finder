import { Router } from "express";
const router = Router();

import { 
    viewIPAddresses,
    deleteIPAddress,
    ipMetrics,
    viewIPCities,
    viewipaddressdetails,
    pieChartPage,
    renderCountryMetricsPage

  } from "../controllers/ipAddress.js";
import ensureAuthenticated from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import cacheMiddleware from "../middlewares/cacheMiddleware.js"
import { checkSudoMiddleware }from "../middlewares/sudo.js"

router.get("/view-ip-addresses", cacheMiddleware, ensureAuthenticated, isAdmin, checkSudoMiddleware, viewIPAddresses)
router.delete('/ip-addresses/:id', isAdmin, ensureAuthenticated, checkSudoMiddleware, deleteIPAddress)
router.get('/ip-addresses/:id', isAdmin, ensureAuthenticated, checkSudoMiddleware, deleteIPAddress)

router.get("/metrics", ensureAuthenticated, cacheMiddleware, isAdmin, checkSudoMiddleware, ipMetrics);
router.get("/cities", ensureAuthenticated, cacheMiddleware, isAdmin, checkSudoMiddleware, viewIPCities);
router.get("/ip-address-details/:id", ensureAuthenticated, cacheMiddleware, isAdmin, checkSudoMiddleware, viewipaddressdetails);
router.get("/pie-chart", ensureAuthenticated, cacheMiddleware, isAdmin, checkSudoMiddleware, pieChartPage);
router.get("/country-metrics", ensureAuthenticated, cacheMiddleware, isAdmin, checkSudoMiddleware, renderCountryMetricsPage)

export default router;
