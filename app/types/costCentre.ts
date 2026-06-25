export interface CostCentre {
  SNO:                     number;
  COSTID:                  string;   // e.g. "01"
  COSTNAME:                string;   // e.g. "Main Store"
  ACTIVE:                  string;   // "Y" | "N"
  COMPCODE:                string;
  ADD1:                    string;
  ADD2:                    string;
  CITY:                    string;
  PINCODE:                 string;
  PHONE:                   string;
  EMAIL:                   string;
  STATECODE:               string;
  DISPLAYORDER:            number;
  DEFCOSTCODE:             string;
  ALTERNATIVECOSTCENTRE:   string;
  ALTERNATIVECOSTCODE:     string;
  SALESRETURNCOSTCODE:     string;
  HOBOFLAG:                string;
  PURENTALLOW:             string;
  IPADDRESS:               string;
  PORTNUMBER:              number;
  SERVERNAME:              string;
  SAMENETWORK:             string;
  VPNCONNECTIVITY:         string;
  PASS:                    string;
  STOCKACC:                string | null;
  USERID:                  string;
  DATATRANFLAG:            string;
  CREATEDBY:               number;
  CREATEDDATE:             string;
  CREATEDTIME:             string;
  CITYCODE:                number;
}
